import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { get, query, run } from '../db/database.js';
import { requireAuth, requireRole, enforceInstitutionScope, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { ComplianceEngine } from '../services/complianceEngine.js';

const router = Router();

// Setup Multer storage in server/uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// GET /api/documents - List documents with validity tracking
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { institutionId, documentType, verificationStatus } = req.query;

  let sql = `
    SELECT d.*, i.name as institution_name, i.aicte_permanent_id, i.region,
           u.name as verified_by_name
    FROM documents d
    JOIN institutions i ON d.institution_id = i.id
    LEFT JOIN users u ON d.verified_by_officer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'institution_admin') {
    sql += ' AND d.institution_id = ?';
    params.push(user.institution_id);
  } else if (institutionId) {
    sql += ' AND d.institution_id = ?';
    params.push(institutionId);
  } else if (user.role === 'regional_officer' && user.region) {
    sql += ' AND i.region = ?';
    params.push(user.region);
  }

  if (documentType) {
    sql += ' AND d.document_type = ?';
    params.push(documentType);
  }

  if (verificationStatus) {
    sql += ' AND d.verification_status = ?';
    params.push(verificationStatus);
  }

  sql += ' ORDER BY d.created_at DESC';

  const documents = query<any>(sql, params);

  res.json({
    success: true,
    documents: documents.map(doc => {
      let daysUntilExpiry: number | null = null;
      let isExpired = false;
      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date).getTime();
        daysUntilExpiry = Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24));
        isExpired = daysUntilExpiry < 0;
      }
      return {
        ...doc,
        daysUntilExpiry,
        isExpired,
      };
    }),
  });
});

// POST /api/documents/upload - Upload new or initial document
router.post('/upload', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { documentType, documentName, institutionId, applicationId, obligationId, issueDate, expiryDate } = req.body;

  const targetInstId = user.role === 'institution_admin' ? user.institution_id : institutionId;
  if (!targetInstId) {
    return res.status(400).json({ error: 'Institution ID is required.' });
  }

  const docId = `DOC-${Date.now()}`;
  const fileName = req.file ? req.file.originalname : (documentName || `${documentType}.pdf`);
  const filePath = req.file ? req.file.path : `/uploads/simulated_${docId}.pdf`;
  const fileSize = req.file ? req.file.size : 245000;
  const mimeType = req.file ? req.file.mimetype : 'application/pdf';

  run(
    `INSERT INTO documents (id, institution_id, application_id, obligation_id, document_type, document_name, file_path, file_size, mime_type, version, issue_date, expiry_date, verification_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'PENDING', datetime('now'))`,
    [
      docId,
      targetInstId,
      applicationId || null,
      obligationId || null,
      documentType || 'MANDATORY_DISCLOSURE',
      fileName,
      filePath,
      fileSize,
      mimeType,
      issueDate || null,
      expiryDate || null,
    ]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'UPLOAD_DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: docId,
    details: { documentType, fileName, expiryDate },
  });

  res.status(201).json({
    success: true,
    message: 'Document uploaded and queued for regulatory verification.',
    documentId: docId,
    documentName: fileName,
  });
});

// POST /api/documents/:id/replace - Replacement of an expired or deficient document (preserves v1, creates v2)
router.post('/:id/replace', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { issueDate, expiryDate, documentName } = req.body;

  const prevDoc = get<any>('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!prevDoc) {
    return res.status(404).json({ error: 'Original document not found.' });
  }

  if (!enforceInstitutionScope(req, res, prevDoc.institution_id)) {
    return;
  }

  const fileName = req.file ? req.file.originalname : (documentName || `Renewed_${prevDoc.document_name}`);
  const filePath = req.file ? req.file.path : `/uploads/renewed_${Date.now()}.pdf`;
  const fileSize = req.file ? req.file.size : 256000;

  try {
    const result = ComplianceEngine.replaceDocument({
      previousDocId: prevDoc.id,
      institutionId: prevDoc.institution_id,
      documentType: prevDoc.document_type,
      documentName: fileName,
      filePath,
      fileSize,
      issueDate,
      expiryDate,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
    });

    res.json({
      message: `Document renewed to version ${result.version}. Previous version archived in audit trail.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/documents/:id/verify - Officer verifies document authenticity
router.post('/:id/verify', requireAuth, requireRole('scrutiny_officer', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, notes } = req.body; // 'VERIFIED' or 'REJECTED'

  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be VERIFIED or REJECTED.' });
  }

  const now = new Date().toISOString();
  run(
    `UPDATE documents
     SET verification_status = ?,
         verified_by_officer_id = ?,
         verified_at = ?,
         notes = ?
     WHERE id = ?`,
    [status, user.id, now, notes || `Verified by ${user.name}`, req.params.id]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
    entityType: 'DOCUMENT',
    entityId: req.params.id,
    details: { status, notes },
  });

  res.json({
    success: true,
    message: `Document marked as ${status}.`,
  });
});

export default router;
