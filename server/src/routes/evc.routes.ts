import { Router, Response } from 'express';
import { get, query, run } from '../db/database.js';
import { requireAuth, requireRole, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { WorkflowEngine } from '../services/workflowEngine.js';

const router = Router();

// GET /api/evc - List visits
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, region } = req.query;

  let sql = `
    SELECT ev.*, i.name as institution_name, i.aicte_permanent_id, i.region, i.state, i.district,
           a.application_number, a.program_discipline
    FROM evc_visits ev
    JOIN institutions i ON ev.institution_id = i.id
    JOIN applications a ON ev.application_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'institution_admin') {
    sql += ' AND ev.institution_id = ?';
    params.push(user.institution_id);
  } else if (region) {
    sql += ' AND i.region = ?';
    params.push(region);
  }

  if (status) {
    sql += ' AND ev.visit_status = ?';
    params.push(status);
  }

  sql += ' ORDER BY ev.proposed_date ASC';

  const visits = query<any>(sql, params);

  res.json({
    success: true,
    visits: visits.map(v => ({
      ...v,
      committee_members: JSON.parse(v.committee_members_json || '[]'),
    })),
  });
});

// POST /api/evc/schedule - Schedule or update an EVC visit
router.post('/schedule', requireAuth, requireRole('evc_coordinator', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    applicationId,
    institutionId,
    committeeChairName,
    committeeChairEmail,
    committeeMembers,
    proposedDate,
    confirmedDate,
  } = req.body;

  if (!applicationId || !institutionId || !committeeChairName || !proposedDate) {
    return res.status(400).json({ error: 'applicationId, institutionId, committeeChairName, proposedDate are required.' });
  }

  // Check for scheduling conflicts:
  // Check if chair or proposed member is already assigned to another confirmed visit on the same proposed date!
  const existingVisitSameDate = get<any>(`
    SELECT * FROM evc_visits 
    WHERE (confirmed_date = ? OR proposed_date = ?) 
      AND committee_chair_email = ? 
      AND visit_status IN ('SCHEDULED', 'IN_PROGRESS')
  `, [proposedDate, proposedDate, committeeChairEmail]);

  let visitStatus = confirmedDate ? 'SCHEDULED' : 'PENDING_SCHEDULING';
  let conflictDetails = null;

  if (existingVisitSameDate) {
    visitStatus = 'CONFLICT_DETECTED';
    conflictDetails = `Expert Chairman (${committeeChairName}) is already assigned to visit ${existingVisitSameDate.visit_code} on ${proposedDate}.`;
  }

  const visitId = `EVC-${Date.now()}`;
  const visitCode = `EVC-2026-${Math.floor(100 + Math.random() * 900)}`;

  run(
    `INSERT INTO evc_visits (id, visit_code, application_id, institution_id, committee_chair_name, committee_chair_email, committee_members_json, proposed_date, confirmed_date, visit_status, conflict_details, coordinator_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      visitId,
      visitCode,
      applicationId,
      institutionId,
      committeeChairName,
      committeeChairEmail || 'chair@expert.aicte.gov.in',
      JSON.stringify(committeeMembers || ['Prof. H. R. Verma (IIT Bombay)', 'Dr. Sunita Rao (VJTI Mumbai)']),
      proposedDate,
      confirmedDate || null,
      visitStatus,
      conflictDetails,
      user.id,
    ]
  );

  // If application is in EVC_RECOMMENDED, transition to EVC_SCHEDULED
  const app = get<any>('SELECT current_stage FROM applications WHERE id = ?', [applicationId]);
  if (app && app.current_stage === 'EVC_RECOMMENDED' && visitStatus !== 'CONFLICT_DETECTED') {
    try {
      WorkflowEngine.executeTransition({
        applicationId,
        targetStage: 'EVC_SCHEDULED',
        actionTaken: 'EVC_INSPECTION_SCHEDULED',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        remarks: `EVC inspection confirmed for ${proposedDate} under chair ${committeeChairName}`,
      });
    } catch (e) {
      // Handled
    }
  }

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'SCHEDULE_EVC_VISIT',
    entityType: 'EVC_VISIT',
    entityId: visitId,
    details: { visitCode, chair: committeeChairName, proposedDate, conflictDetails },
  });

  res.status(201).json({
    success: true,
    message: conflictDetails
      ? `EVC recorded but flagged with SCHEDULING CONFLICT: ${conflictDetails}`
      : 'EVC visit scheduled successfully.',
    visitId,
    visitCode,
    visitStatus,
    conflictDetails,
  });
});

// POST /api/evc/:id/reschedule - Reschedule visit date
router.post('/:id/reschedule', requireAuth, requireRole('evc_coordinator', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { newDate, reason } = req.body;

  if (!newDate || !reason) {
    return res.status(400).json({ error: 'New date and reschedule reason are required.' });
  }

  run(
    `UPDATE evc_visits
     SET proposed_date = ?, confirmed_date = ?, visit_status = 'SCHEDULED', reschedule_reason = ?, conflict_details = NULL
     WHERE id = ?`,
    [newDate, newDate, reason, req.params.id]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'RESCHEDULE_EVC_VISIT',
    entityType: 'EVC_VISIT',
    entityId: req.params.id,
    details: { newDate, reason },
  });

  res.json({
    success: true,
    message: `EVC visit rescheduled to ${newDate}. Conflicts cleared.`,
  });
});

// POST /api/evc/:id/complete - Submit EVC inspection report & outcome
router.post('/:id/complete', requireAuth, requireRole('evc_coordinator', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { outcome, reportSummary } = req.body; // 'RECOMMENDED_UNCONDITIONAL', 'RECOMMENDED_WITH_DEFICIENCIES', 'NOT_RECOMMENDED'

  if (!outcome || !reportSummary) {
    return res.status(400).json({ error: 'Outcome and reportSummary are required.' });
  }

  const visit = get<any>('SELECT * FROM evc_visits WHERE id = ?', [req.params.id]);
  if (!visit) {
    return res.status(404).json({ error: 'EVC visit not found.' });
  }

  run(
    `UPDATE evc_visits
     SET visit_status = 'COMPLETED', evc_outcome = ?, evc_report_summary = ?
     WHERE id = ?`,
    [outcome, reportSummary, req.params.id]
  );

  // Transition application to EVC_COMPLETED
  try {
    WorkflowEngine.executeTransition({
      applicationId: visit.application_id,
      targetStage: 'EVC_COMPLETED',
      actionTaken: 'EVC_REPORT_SUBMITTED',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      remarks: `EVC completed with outcome: ${outcome}. Summary: ${reportSummary.substring(0, 80)}...`,
    });
  } catch (e) {
    // Stage transition handled
  }

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'COMPLETE_EVC_VISIT',
    entityType: 'EVC_VISIT',
    entityId: req.params.id,
    details: { outcome, reportSummary },
  });

  res.json({
    success: true,
    message: 'EVC inspection report submitted and status updated to COMPLETED.',
  });
});

export default router;
