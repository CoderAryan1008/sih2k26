import { Router, Response } from 'express';
import { get, query, run } from '../db/database.js';
import { requireAuth, requireRole, enforceInstitutionScope, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { ComplianceEngine } from '../services/complianceEngine.js';

const router = Router();

// GET /api/compliance - List obligations
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, category, institutionId } = req.query;

  let sql = `
    SELECT c.*, i.name as institution_name, i.aicte_permanent_id, i.region,
           u.name as reviewer_name, d.document_name as evidence_doc_name
    FROM compliance_obligations c
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.reviewer_id = u.id
    LEFT JOIN documents d ON c.evidence_document_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Data isolation
  if (user.role === 'institution_admin') {
    sql += ' AND c.institution_id = ?';
    params.push(user.institution_id);
  } else if (institutionId) {
    sql += ' AND c.institution_id = ?';
    params.push(institutionId);
  } else if (user.role === 'regional_officer' && user.region) {
    sql += ' AND i.region = ?';
    params.push(user.region);
  }

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }

  sql += ' ORDER BY c.escalation_level DESC, c.due_date ASC';

  const obligations = query<any>(sql, params);

  res.json({
    success: true,
    obligations: obligations.map(ob => {
      const now = Date.now();
      const dueDate = new Date(ob.due_date).getTime();
      const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      return {
        ...ob,
        daysRemaining,
        isOverdue: daysRemaining < 0 && !['FULFILLED_ACCEPTED', 'CLOSED'].includes(ob.status),
      };
    }),
  });
});

// GET /api/compliance/:id - Details of single obligation
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const ob = get<any>(`
    SELECT c.*, i.name as institution_name, i.aicte_permanent_id, i.region,
           u.name as reviewer_name, d.document_name as evidence_doc_name, d.file_path as evidence_file_path
    FROM compliance_obligations c
    JOIN institutions i ON c.institution_id = i.id
    LEFT JOIN users u ON c.reviewer_id = u.id
    LEFT JOIN documents d ON c.evidence_document_id = d.id
    WHERE c.id = ?
  `, [req.params.id]);

  if (!ob) {
    return res.status(404).json({ error: 'Compliance obligation not found.' });
  }

  if (!enforceInstitutionScope(req, res, ob.institution_id)) {
    return;
  }

  res.json({ success: true, obligation: ob });
});

// POST /api/compliance - Create new compliance obligation
router.post('/', requireAuth, requireRole('regional_officer', 'senior_management', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { institutionId, applicationId, title, description, category, ruleReference, dueDate } = req.body;

  if (!institutionId || !title || !category || !ruleReference || !dueDate) {
    return res.status(400).json({ error: 'Required fields: institutionId, title, category, ruleReference, dueDate' });
  }

  const obId = `COMP-${Date.now()}`;
  const obCode = `OBL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  run(
    `INSERT INTO compliance_obligations (id, obligation_code, institution_id, application_id, title, description, category, rule_reference, due_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_SUBMISSION', datetime('now'))`,
    [obId, obCode, institutionId, applicationId || null, title, description || title, category, ruleReference, dueDate]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'CREATE_COMPLIANCE_OBLIGATION',
    entityType: 'COMPLIANCE_OBLIGATION',
    entityId: obId,
    details: { obligationCode: obCode, title, category, dueDate },
  });

  res.status(201).json({
    success: true,
    message: 'Compliance obligation created and assigned to institution.',
    obligationId: obId,
    obligationCode: obCode,
  });
});

// POST /api/compliance/:id/submit-evidence - Institution submits evidence
router.post('/:id/submit-evidence', requireAuth, requireRole('institution_admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { evidenceDocumentId, submissionNotes } = req.body;

  if (!evidenceDocumentId) {
    return res.status(400).json({ error: 'Evidence document ID is required.' });
  }

  try {
    const result = ComplianceEngine.submitEvidence({
      obligationId: req.params.id,
      institutionId: user.institution_id || '',
      evidenceDocumentId,
      submissionNotes: submissionNotes || 'Institutional compliance undertaking & verification certificate submitted.',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
    });

    res.json({ ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/compliance/:id/review - Reviewer accepts or returns for corrections
router.post('/:id/review', requireAuth, requireRole('scrutiny_officer', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { decision, reviewerNotes } = req.body;

  if (!['ACCEPT', 'RETURN_DEFICIENT'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be ACCEPT or RETURN_DEFICIENT.' });
  }

  if (!reviewerNotes) {
    return res.status(400).json({ error: 'Reviewer notes are mandatory.' });
  }

  try {
    const result = ComplianceEngine.reviewEvidence({
      obligationId: req.params.id,
      decision,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: user.role,
      reviewerNotes,
    });

    res.json({ ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
