import { Router, Response } from 'express';
import { get, query, run, transaction } from '../db/database.js';
import { requireAuth, requireRole, enforceInstitutionScope, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { WorkflowEngine, WORKFLOW_STAGES } from '../services/workflowEngine.js';
import { AIAssistantService } from '../services/aiAssistantService.js';

const router = Router();

// GET /api/applications - List applications with role scoping, filters & search
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { stage, status, region, search, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT a.*, i.name as institution_name, i.aicte_permanent_id, i.state, i.type as institution_type,
           u.name as officer_name
    FROM applications a
    JOIN institutions i ON a.institution_id = i.id
    LEFT JOIN users u ON a.assigned_officer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Institution Admin isolation: can ONLY see their own institution's applications
  if (user.role === 'institution_admin') {
    sql += ' AND a.institution_id = ?';
    params.push(user.institution_id);
  } else if (user.role === 'regional_officer' && user.region && !region) {
    // Default to regional officer's region
    sql += ' AND a.region = ?';
    params.push(user.region);
  }

  if (region && user.role !== 'institution_admin') {
    sql += ' AND a.region = ?';
    params.push(region);
  }

  if (stage) {
    sql += ' AND a.current_stage = ?';
    params.push(stage);
  }

  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }

  if (search) {
    const kw = `%${search}%`;
    sql += ' AND (a.application_number LIKE ? OR i.name LIKE ? OR a.program_discipline LIKE ?)';
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY a.priority_score DESC, a.deadline_at ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const applications = query<any>(sql, params);

  // Total count for pagination
  const countSql = sql.replace(/SELECT a\.\*[\s\S]*?FROM/, 'SELECT count(*) as total FROM').replace(/ORDER BY[\s\S]*$/, '');
  const countParams = params.slice(0, -2);
  const totalRow = get<any>(countSql, countParams);

  res.json({
    success: true,
    total: totalRow?.total || applications.length,
    applications: applications.map(app => {
      const now = Date.now();
      const deadline = new Date(app.deadline_at).getTime();
      const msDiff = deadline - now;
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      return {
        ...app,
        daysRemaining,
        isOverdue: daysRemaining < 0,
        stageName: WORKFLOW_STAGES[app.current_stage]?.name || app.current_stage,
      };
    }),
  });
});

// GET /api/applications/:id - Comprehensive application detail
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const app = get<any>(`
    SELECT a.*, i.name as institution_name, i.aicte_permanent_id, i.state, i.district, i.address,
           i.type as institution_type, i.contact_email, i.contact_phone, i.principal_name,
           u.name as officer_name, u.email as officer_email, u.designation as officer_designation
    FROM applications a
    JOIN institutions i ON a.institution_id = i.id
    LEFT JOIN users u ON a.assigned_officer_id = u.id
    WHERE a.id = ?
  `, [req.params.id]);

  if (!app) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  // Security check: Institution admin cannot access other institutions' dossiers
  if (!enforceInstitutionScope(req, res, app.institution_id)) {
    return;
  }

  // 1. Stage transition history
  const history = query<any>(`
    SELECT * FROM stage_transitions 
    WHERE application_id = ? 
    ORDER BY timestamp ASC
  `, [app.id]);

  // 2. Scrutiny deficiencies
  const observations = query<any>(`
    SELECT o.*, u.name as officer_name
    FROM scrutiny_observations o
    LEFT JOIN users u ON o.officer_id = u.id
    WHERE o.application_id = ?
    ORDER BY o.created_at DESC
  `, [app.id]);

  // 3. Compliance obligations
  const obligations = query<any>(`
    SELECT * FROM compliance_obligations 
    WHERE application_id = ? OR institution_id = ?
    ORDER BY due_date ASC
  `, [app.id, app.institution_id]);

  // 4. Documents
  const documents = query<any>(`
    SELECT * FROM documents 
    WHERE application_id = ? OR (institution_id = ? AND application_id IS NULL)
    ORDER BY created_at DESC
  `, [app.id, app.institution_id]);

  // 5. EVC Visit (if any)
  const evcVisit = get<any>(`
    SELECT * FROM evc_visits 
    WHERE application_id = ?
  `, [app.id]);

  // 6. Active Alerts
  const alerts = query<any>(`
    SELECT * FROM alerts 
    WHERE (entity_id = ? AND entity_type = 'APPLICATION')
       OR (institution_id = ? AND is_resolved = 0)
    ORDER BY escalation_level DESC, created_at DESC
  `, [app.id, app.institution_id]);

  // Permitted next transitions for the current user's role
  const stageDef = WORKFLOW_STAGES[app.current_stage];
  const allowedNextStages = stageDef?.allowedNextStages || [];
  const permittedActions = allowedNextStages.map(nextStage => ({
    targetStage: nextStage,
    targetName: WORKFLOW_STAGES[nextStage]?.name || nextStage,
    description: WORKFLOW_STAGES[nextStage]?.description || '',
    isAuthorized: user.role === 'super_admin' || stageDef.allowedRoles.includes(user.role),
    checklist: WORKFLOW_STAGES[nextStage]?.mandatoryChecklist || [],
  }));

  const now = Date.now();
  const msDiff = new Date(app.deadline_at).getTime() - now;
  const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  res.json({
    success: true,
    application: {
      ...app,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      stageName: stageDef?.name || app.current_stage,
      stageDescription: stageDef?.description,
      allowedRoles: stageDef?.allowedRoles,
    },
    permittedActions,
    history,
    observations,
    obligations,
    documents,
    evcVisit,
    alerts,
    stagesOverview: Object.values(WORKFLOW_STAGES),
  });
});

// POST /api/applications - Institution creates a new application
router.post('/', requireAuth, requireRole('institution_admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { institutionId, programDiscipline, proposedIntake, applicationType = 'NEW_INSTITUTION' } = req.body;

  const targetInstId = user.role === 'institution_admin' ? user.institution_id : institutionId;
  if (!targetInstId) {
    return res.status(400).json({ error: 'Institution ID is required.' });
  }

  const institution = get<any>('SELECT * FROM institutions WHERE id = ?', [targetInstId]);
  if (!institution) {
    return res.status(404).json({ error: 'Institution record not found.' });
  }

  const appId = `APP-${Date.now()}`;
  const appNumber = `AICTE/2026-27/${institution.region.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date();
  const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days draft SLA

  run(
    `INSERT INTO applications (id, application_number, institution_id, workflow_code, academic_year, program_discipline, proposed_intake, current_stage, status, region, submitted_at, stage_entered_at, deadline_at, priority_score, risk_level)
     VALUES (?, ?, ?, ?, '2026-2027', ?, ?, 'DRAFT', 'ACTIVE', ?, ?, ?, ?, 20, 'LOW')`,
    [
      appId,
      appNumber,
      targetInstId,
      applicationType,
      programDiscipline || 'Engineering & Technology',
      proposedIntake || 120,
      institution.region,
      now.toISOString(),
      now.toISOString(),
      deadline.toISOString(),
    ]
  );

  // Initial stage transition record
  run(
    `INSERT INTO stage_transitions (id, application_id, from_stage, to_stage, action_taken, actor_id, actor_name, actor_role, remarks, timestamp)
     VALUES (?, ?, 'NONE', 'DRAFT', 'APPLICATION_INITIALIZED', ?, ?, ?, 'Draft application created in portal', ?)`,
    [`TR-${Date.now()}`, appId, user.id, user.name, user.role, now.toISOString()]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'CREATE_APPLICATION',
    entityType: 'APPLICATION',
    entityId: appId,
    details: { appNumber, institution: institution.name, programDiscipline },
  });

  res.status(201).json({
    success: true,
    message: 'Application created successfully in DRAFT state.',
    applicationId: appId,
    applicationNumber: appNumber,
  });
});

// POST /api/applications/:id/transition - Advance stage in workflow
router.post('/:id/transition', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { targetStage, actionTaken, remarks, checklistAnswers } = req.body;

  if (!targetStage) {
    return res.status(400).json({ error: 'Target stage is required.' });
  }

  const app = get<any>('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  if (!app) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  if (!enforceInstitutionScope(req, res, app.institution_id)) {
    return;
  }

  try {
    const result = WorkflowEngine.executeTransition({
      applicationId: req.params.id,
      targetStage,
      actionTaken: actionTaken || `Transitioned to ${targetStage}`,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      remarks,
      checklistAnswers,
    });

    res.json({
      success: true,
      message: `Workflow stage advanced successfully to ${targetStage}.`,
      result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Workflow transition failed.',
    });
  }
});

// POST /api/applications/:id/observations - Record scrutiny deficiency
router.post('/:id/observations', requireAuth, requireRole('scrutiny_officer', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { category, severity = 'MAJOR', observationText, ruleReference } = req.body;

  if (!category || !observationText || !ruleReference) {
    return res.status(400).json({ error: 'Category, observationText, and ruleReference are required.' });
  }

  const app = get<any>('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  if (!app) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const obsId = `OBS-${Date.now()}`;
  const now = new Date().toISOString();

  run(
    `INSERT INTO scrutiny_observations (id, application_id, officer_id, category, severity, observation_text, rule_reference, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
    [obsId, req.params.id, user.id, category, severity, observationText, ruleReference, now]
  );

  // If application is in scrutiny, transition to DEFICIENCIES_COMMUNICATED
  if (['SCRUTINY_IN_PROGRESS', 'PRELIMINARY_SCRUTINY'].includes(app.current_stage)) {
    try {
      WorkflowEngine.executeTransition({
        applicationId: app.id,
        targetStage: 'DEFICIENCIES_COMMUNICATED',
        actionTaken: 'DEFICIENCIES_RECORDED',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        remarks: `Deficiencies communicated: [${category}] ${observationText.substring(0, 80)}...`,
      });
    } catch (e) {
      // Proceed even if transition auto-hook already processed
    }
  }

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'SCRUTINY_DEFICIENCY_RECORDED',
    entityType: 'SCRUTINY_OBSERVATION',
    entityId: obsId,
    details: { applicationId: app.id, category, severity, ruleReference },
  });

  res.status(201).json({
    success: true,
    message: 'Scrutiny deficiency recorded and communicated.',
    observationId: obsId,
  });
});

// POST /api/applications/:id/observations/:obsId/respond - Institution responds to deficiency
router.post('/:id/observations/:obsId/respond', requireAuth, requireRole('institution_admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { responseText } = req.body;

  if (!responseText) {
    return res.status(400).json({ error: 'Response text is required.' });
  }

  const obs = get<any>('SELECT * FROM scrutiny_observations WHERE id = ?', [req.params.obsId]);
  if (!obs) {
    return res.status(404).json({ error: 'Scrutiny observation not found.' });
  }

  const now = new Date().toISOString();
  run(
    `UPDATE scrutiny_observations
     SET institution_response = ?, institution_response_at = ?
     WHERE id = ?`,
    [responseText, now, req.params.obsId]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'INSTITUTION_DEFICIENCY_RESPONDED',
    entityType: 'SCRUTINY_OBSERVATION',
    entityId: req.params.obsId,
    details: { responseText },
  });

  res.json({
    success: true,
    message: 'Deficiency response submitted. Queued for Re-Scrutiny verification.',
  });
});

// POST /api/applications/:id/observations/:obsId/resolve - Officer resolves deficiency
router.post('/:id/observations/:obsId/resolve', requireAuth, requireRole('scrutiny_officer', 'regional_officer', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const now = new Date().toISOString();

  run(
    `UPDATE scrutiny_observations
     SET status = 'RESOLVED', resolved_at = ?
     WHERE id = ?`,
    [now, req.params.obsId]
  );

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'SCRUTINY_DEFICIENCY_RESOLVED',
    entityType: 'SCRUTINY_OBSERVATION',
    entityId: req.params.obsId,
  });

  res.json({
    success: true,
    message: 'Deficiency item marked as RESOLVED.',
  });
});

// POST /api/applications/:id/assign - Reassign application to another officer
router.post('/:id/assign', requireAuth, requireRole('regional_officer', 'senior_management', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { officerId, remarks } = req.body;

  const targetOfficer = get<any>('SELECT * FROM users WHERE id = ? AND role IN ("scrutiny_officer", "regional_officer")', [officerId]);
  if (!targetOfficer) {
    return res.status(400).json({ error: 'Invalid officer selected for assignment.' });
  }

  run('UPDATE applications SET assigned_officer_id = ?, updated_at = ? WHERE id = ?', [
    officerId,
    new Date().toISOString(),
    req.params.id,
  ]);

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'APPLICATION_REASSIGNED',
    entityType: 'APPLICATION',
    entityId: req.params.id,
    details: { assignedToOfficer: targetOfficer.name, remarks },
  });

  res.json({
    success: true,
    message: `Application reassigned to ${targetOfficer.name} successfully.`,
  });
});

// GET /api/applications/:id/summary - AI-powered case dossier summary
router.get('/:id/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const app = get<any>('SELECT institution_id FROM applications WHERE id = ?', [req.params.id]);
  if (!app) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  if (!enforceInstitutionScope(req, res, app.institution_id)) {
    return;
  }

  try {
    const summary = AIAssistantService.generateCaseSummary(req.params.id);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate summary.' });
  }
});

export default router;
