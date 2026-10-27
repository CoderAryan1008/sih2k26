import { Router, Response } from 'express';
import { get, query } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { WORKFLOW_STAGES } from '../services/workflowEngine.js';
import { AIAssistantService } from '../services/aiAssistantService.js';

const router = Router();

// GET /api/analytics/dashboard - Consolidated metrics customized to the calling role
router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const now = new Date().toISOString();

  let instCondition = '';
  let regionCondition = '';
  const params: any[] = [];

  if (user.role === 'institution_admin') {
    instCondition = ' AND a.institution_id = ?';
    params.push(user.institution_id);
  } else if (user.role === 'regional_officer' && user.region) {
    regionCondition = ' AND a.region = ?';
    params.push(user.region);
  }

  // 1. KPI Counts
  const totalApps = get<any>(`SELECT count(*) as count FROM applications a WHERE 1=1 ${instCondition} ${regionCondition}`, params)?.count || 0;
  const activeApps = get<any>(`SELECT count(*) as count FROM applications a WHERE a.status IN ('ACTIVE', 'PENDING_ACTION') ${instCondition} ${regionCondition}`, params)?.count || 0;
  const approvedApps = get<any>(`SELECT count(*) as count FROM applications a WHERE a.current_stage = 'APPROVED' ${instCondition} ${regionCondition}`, params)?.count || 0;
  const overdueApps = get<any>(`SELECT count(*) as count FROM applications a WHERE a.status IN ('ACTIVE', 'PENDING_ACTION') AND a.deadline_at < datetime('now') ${instCondition} ${regionCondition}`, params)?.count || 0;
  const criticalRiskApps = get<any>(`SELECT count(*) as count FROM applications a WHERE a.risk_level IN ('CRITICAL', 'HIGH') AND a.status IN ('ACTIVE', 'PENDING_ACTION') ${instCondition} ${regionCondition}`, params)?.count || 0;

  // 2. Stage-wise Pendency Breakdown
  const stageStats = query<any>(`
    SELECT a.current_stage, count(*) as count,
           avg(julianday('now') - julianday(a.stage_entered_at)) as avg_dwell_days,
           sum(CASE WHEN a.deadline_at < datetime('now') THEN 1 ELSE 0 END) as overdue_count
    FROM applications a
    WHERE a.status IN ('ACTIVE', 'PENDING_ACTION') ${instCondition} ${regionCondition}
    GROUP BY a.current_stage
  `, params);

  // Map stage names
  const stageBreakdown = stageStats.map(s => ({
    stageCode: s.current_stage,
    stageName: WORKFLOW_STAGES[s.current_stage]?.name || s.current_stage,
    count: s.count,
    avgDwellDays: Math.round((s.avg_dwell_days || 0) * 10) / 10,
    overdueCount: s.overdue_count,
    slaDays: WORKFLOW_STAGES[s.current_stage]?.slaDays || 7,
  }));

  // 3. Region-wise volume (for Senior Management / Super Admin)
  const regionBreakdown = query<any>(`
    SELECT a.region, count(*) as total,
           sum(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
           sum(CASE WHEN a.deadline_at < datetime('now') AND a.status IN ('ACTIVE', 'PENDING_ACTION') THEN 1 ELSE 0 END) as overdue
    FROM applications a
    GROUP BY a.region
  `);

  // 4. Compliance Obligation Overview
  let compSql = 'SELECT status, count(*) as count FROM compliance_obligations WHERE 1=1';
  const compParams: any[] = [];
  if (user.role === 'institution_admin') {
    compSql += ' AND institution_id = ?';
    compParams.push(user.institution_id);
  }
  compSql += ' GROUP BY status';
  const complianceStats = query<any>(compSql, compParams);

  // 5. Active Escalations Count by Level
  let alertSql = 'SELECT escalation_level, count(*) as count FROM alerts WHERE is_resolved = 0';
  const alertParams: any[] = [];
  if (user.role === 'institution_admin') {
    alertSql += ' AND institution_id = ?';
    alertParams.push(user.institution_id);
  }
  alertSql += ' GROUP BY escalation_level';
  const escalationStats = query<any>(alertSql, alertParams);

  // 6. Recent critical alerts
  let recentAlertsSql = `
    SELECT al.*, i.name as institution_name
    FROM alerts al
    JOIN institutions i ON al.institution_id = i.id
    WHERE al.is_resolved = 0
  `;
  const recentAlertsParams: any[] = [];
  if (user.role === 'institution_admin') {
    recentAlertsSql += ' AND al.institution_id = ?';
    recentAlertsParams.push(user.institution_id);
  } else if (user.role === 'regional_officer' && user.region) {
    recentAlertsSql += ' AND i.region = ?';
    recentAlertsParams.push(user.region);
  }
  recentAlertsSql += ' ORDER BY al.escalation_level DESC, al.risk_score DESC LIMIT 6';
  const recentAlerts = query<any>(recentAlertsSql, recentAlertsParams);

  res.json({
    success: true,
    kpis: {
      totalApplications: totalApps,
      activePending: activeApps,
      approved: approvedApps,
      overdueSla: overdueApps,
      criticalRiskCount: criticalRiskApps,
      complianceFulfilmentRate: calculateComplianceRate(complianceStats),
    },
    stageBreakdown,
    regionBreakdown,
    complianceStats,
    escalationStats,
    recentAlerts,
  });
});

function calculateComplianceRate(stats: any[]): number {
  let fulfilled = 0;
  let total = 0;
  for (const s of stats) {
    total += s.count;
    if (s.status === 'FULFILLED_ACCEPTED' || s.status === 'CLOSED') {
      fulfilled += s.count;
    }
  }
  return total > 0 ? Math.round((fulfilled / total) * 100) : 100;
}

// GET /api/analytics/bottlenecks - Dedicated pendency & bottleneck intelligence
router.get('/bottlenecks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = AIAssistantService.detectBottlenecks();
  res.json({ success: true, ...result });
});

// GET /api/analytics/export/csv - Export applications report as CSV
router.get('/export/csv', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let sql = `
    SELECT a.application_number, i.name as institution_name, i.aicte_permanent_id,
           a.region, a.program_discipline, a.proposed_intake, a.current_stage,
           a.status, a.submitted_at, a.deadline_at, a.priority_score, a.risk_level,
           u.name as assigned_officer
    FROM applications a
    JOIN institutions i ON a.institution_id = i.id
    LEFT JOIN users u ON a.assigned_officer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (user.role === 'institution_admin') {
    sql += ' AND a.institution_id = ?';
    params.push(user.institution_id);
  } else if (user.role === 'regional_officer' && user.region) {
    sql += ' AND a.region = ?';
    params.push(user.region);
  }

  const rows = query<any>(sql, params);

  // Build CSV string
  const headers = ['Application Number', 'Institution Name', 'Permanent ID', 'Region', 'Discipline', 'Intake', 'Current Stage', 'Status', 'Submitted At', 'Deadline', 'Risk Score', 'Risk Level', 'Assigned Officer'];
  const csvLines = [headers.join(',')];

  rows.forEach(r => {
    csvLines.push([
      `"${r.application_number}"`,
      `"${r.institution_name.replace(/"/g, '""')}"`,
      `"${r.aicte_permanent_id}"`,
      `"${r.region}"`,
      `"${r.program_discipline}"`,
      r.proposed_intake,
      `"${r.current_stage}"`,
      `"${r.status}"`,
      `"${r.submitted_at}"`,
      `"${r.deadline_at}"`,
      r.priority_score,
      `"${r.risk_level}"`,
      `"${r.assigned_officer || 'Unassigned'}"`,
    ].join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="AICTE_Applications_Report.csv"');
  res.send(csvLines.join('\n'));
});

export default router;
