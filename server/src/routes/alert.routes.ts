import { Router, Response } from 'express';
import { get, query, run } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { EscalationEngine } from '../services/escalationEngine.js';

const router = Router();

// GET /api/alerts - List active or historical alerts
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { escalationLevel, severity, isResolved, entityType } = req.query;

  let sql = `
    SELECT al.*, i.name as institution_name, i.aicte_permanent_id, i.region,
           u.name as ack_user_name
    FROM alerts al
    JOIN institutions i ON al.institution_id = i.id
    LEFT JOIN users u ON al.acknowledged_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping
  if (user.role === 'institution_admin') {
    sql += ' AND al.institution_id = ?';
    params.push(user.institution_id);
  } else if (user.role === 'regional_officer' && user.region) {
    sql += ' AND i.region = ?';
    params.push(user.region);
  }

  if (escalationLevel !== undefined && escalationLevel !== '') {
    sql += ' AND al.escalation_level = ?';
    params.push(Number(escalationLevel));
  }

  if (severity) {
    sql += ' AND al.severity = ?';
    params.push(severity);
  }

  if (isResolved !== undefined && isResolved !== '') {
    sql += ' AND al.is_resolved = ?';
    params.push(Number(isResolved));
  } else {
    // By default return unresolved
    sql += ' AND al.is_resolved = 0';
  }

  if (entityType) {
    sql += ' AND al.entity_type = ?';
    params.push(entityType);
  }

  sql += ' ORDER BY al.escalation_level DESC, al.risk_score DESC, al.created_at DESC';

  const alerts = query<any>(sql, params);

  res.json({
    success: true,
    count: alerts.length,
    alerts,
  });
});

// POST /api/alerts/:id/acknowledge - Supervisor acknowledges escalation
router.post('/:id/acknowledge', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { notes } = req.body;

  try {
    const result = EscalationEngine.acknowledgeAlert({
      alertId: req.params.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      notes: notes || `Acknowledged by ${user.name} (${user.role}). Remedial action scheduled.`,
    });

    res.json({
      message: 'Escalation alert acknowledged and action plan logged.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/run-engine - Trigger automated SLA check & escalation generation
// (Allows judges to test time leap / automated rule triggers on demand!)
router.post('/run-engine', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = EscalationEngine.runEngine();
    res.json({
      success: true,
      message: 'Intelligent SLA & Escalation Engine executed successfully.',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
