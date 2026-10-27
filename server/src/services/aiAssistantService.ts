import { db, get, query } from '../db/database.js';

export class AIAssistantService {
  /**
   * Generates a concise, structured administrative dossier summary for an application
   */
  static generateCaseSummary(applicationId: string) {
    const app = get<any>(`
      SELECT a.*, i.name as institution_name, i.type as institution_type, i.region, i.state,
             u.name as officer_name, u.role as officer_role
      FROM applications a
      JOIN institutions i ON a.institution_id = i.id
      LEFT JOIN users u ON a.assigned_officer_id = u.id
      WHERE a.id = ?
    `, [applicationId]);

    if (!app) {
      throw new Error(`Application ${applicationId} not found.`);
    }

    // Fetch history
    const history = query<any>(`
      SELECT * FROM stage_transitions 
      WHERE application_id = ? 
      ORDER BY timestamp DESC
    `, [applicationId]);

    // Fetch deficiencies
    const deficiencies = query<any>(`
      SELECT * FROM scrutiny_observations 
      WHERE application_id = ? 
      ORDER BY created_at DESC
    `, [applicationId]);

    // Fetch obligations
    const obligations = query<any>(`
      SELECT * FROM compliance_obligations 
      WHERE application_id = ? 
      ORDER BY due_date ASC
    `, [applicationId]);

    // Fetch active alerts
    const alerts = query<any>(`
      SELECT * FROM alerts 
      WHERE entity_id = ? AND is_resolved = 0
    `, [applicationId]);

    const openDeficiencies = deficiencies.filter(d => d.status === 'OPEN');
    const openCritical = openDeficiencies.filter(d => d.severity === 'CRITICAL');
    const daysInCurrentStage = Math.max(
      1,
      Math.ceil((Date.now() - new Date(app.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24))
    );
    const msDiff = new Date(app.deadline_at).getTime() - Date.now();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    // Next required action determination
    let nextRequiredAction = 'Review current application documents';
    let responsibleActor = app.officer_name || 'Regional Bureau';

    switch (app.current_stage) {
      case 'DRAFT':
        nextRequiredAction = 'Institution must finalize mandatory forms and submit processing fee';
        responsibleActor = 'Institution Administrator';
        break;
      case 'SUBMITTED':
        nextRequiredAction = 'Regional Officer must verify preliminary completeness and assign Scrutiny Officer';
        responsibleActor = 'Regional Officer';
        break;
      case 'PRELIMINARY_SCRUTINY':
      case 'SCRUTINY_IN_PROGRESS':
        nextRequiredAction = 'Scrutiny Officer must verify land, faculty cadre, and equipment compliance';
        responsibleActor = app.officer_name || 'Assigned Scrutiny Officer';
        break;
      case 'DEFICIENCIES_COMMUNICATED':
      case 'AWAITING_INSTITUTION_RESPONSE':
        nextRequiredAction = `Institution must submit documentary rectification for ${openDeficiencies.length} identified deficiency item(s)`;
        responsibleActor = app.institution_name;
        break;
      case 'RE_SCRUTINY_PENDING':
        nextRequiredAction = 'Scrutiny Officer must re-evaluate institutional deficiency responses';
        responsibleActor = app.officer_name || 'Scrutiny Officer';
        break;
      case 'EVC_RECOMMENDED':
        nextRequiredAction = 'EVC Coordinator must propose visit date and assign committee experts';
        responsibleActor = 'EVC Coordinator';
        break;
      case 'EVC_SCHEDULED':
        nextRequiredAction = 'Committee to conduct on-site inspection and submit signed report';
        responsibleActor = 'Expert Visit Committee Panel';
        break;
      case 'DECISION_PENDING_COMMITTEE':
        nextRequiredAction = 'Competent Authority / Executive Committee statutory review for final decision';
        responsibleActor = 'AICTE Senior Management';
        break;
      case 'APPROVED':
        nextRequiredAction = 'Application approved. Approval Letter issued.';
        responsibleActor = 'Process Completed';
        break;
    }

    return {
      applicationNumber: app.application_number,
      institution: {
        name: app.institution_name,
        type: app.institution_type,
        region: app.region,
        state: app.state,
      },
      program: app.program_discipline,
      proposedIntake: app.proposed_intake,
      currentStage: app.current_stage,
      status: app.status,
      assignedOfficer: app.officer_name || 'Unassigned',
      metrics: {
        daysInCurrentStage,
        daysRemaining,
        isOverdue: daysRemaining < 0,
        daysOverdue: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
        riskScore: app.priority_score,
        riskLevel: app.risk_level,
      },
      nextAction: {
        action: nextRequiredAction,
        responsible: responsibleActor,
        targetDeadline: app.deadline_at,
      },
      scrutinySummary: {
        totalObservations: deficiencies.length,
        openCount: openDeficiencies.length,
        criticalOpenCount: openCritical.length,
        resolvedCount: deficiencies.filter(d => d.status === 'RESOLVED').length,
        items: openDeficiencies.map(d => ({
          category: d.category,
          severity: d.severity,
          rule: d.rule_reference,
          issue: d.observation_text,
          institutionResponse: d.institution_response || 'Pending institution reply',
        })),
      },
      activeAlertsCount: alerts.length,
      historyCount: history.length,
    };
  }

  /**
   * Explainable Natural Language search: Parses natural language queries into safe SQL filters
   * Enforces role permissions independently!
   */
  static searchAssistant(userQuery: string, userRole: string, userRegion?: string, institutionId?: string) {
    const q = userQuery.toLowerCase().trim();
    let sql = `
      SELECT a.*, i.name as institution_name, i.type as institution_type, i.state,
             u.name as officer_name
      FROM applications a
      JOIN institutions i ON a.institution_id = i.id
      LEFT JOIN users u ON a.assigned_officer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    const appliedFilters: string[] = [];

    // Role-based boundary enforcement
    if (userRole === 'institution_admin') {
      sql += ' AND a.institution_id = ?';
      params.push(institutionId);
      appliedFilters.push('Restricted to current institution records only');
    } else if (userRole === 'regional_officer' && userRegion) {
      sql += ' AND a.region = ?';
      params.push(userRegion);
      appliedFilters.push(`Restricted to ${userRegion} Region`);
    }

    // Natural Language Pattern Matcher
    if (q.includes('overdue') || q.includes('delayed') || q.includes('sla breach')) {
      sql += " AND a.deadline_at < datetime('now') AND a.status IN ('ACTIVE', 'PENDING_ACTION')";
      appliedFilters.push('Filter: Overdue / SLA breached');
    }

    if (q.includes('critical') || q.includes('high risk')) {
      sql += " AND a.risk_level IN ('CRITICAL', 'HIGH')";
      appliedFilters.push('Filter: High or Critical Risk');
    }

    if (q.includes('scrutiny')) {
      sql += " AND a.current_stage LIKE '%SCRUTINY%'";
      appliedFilters.push('Stage: Scrutiny related');
    }

    if (q.includes('evc') || q.includes('visit') || q.includes('inspection')) {
      sql += " AND a.current_stage LIKE '%EVC%'";
      appliedFilters.push('Stage: EVC inspection related');
    }

    if (q.includes('approved')) {
      sql += " AND a.current_stage = 'APPROVED'";
      appliedFilters.push('Status: Approved');
    }

    if (q.includes('western')) {
      sql += " AND a.region = 'Western'";
      appliedFilters.push('Region: Western');
    } else if (q.includes('northern')) {
      sql += " AND a.region = 'Northern'";
      appliedFilters.push('Region: Northern');
    } else if (q.includes('southern')) {
      sql += " AND a.region = 'Southern'";
      appliedFilters.push('Region: Southern');
    }

    if (q.includes('engineering')) {
      sql += " AND a.program_discipline LIKE '%Engineering%'";
      appliedFilters.push('Discipline: Engineering & Technology');
    } else if (q.includes('pharmacy')) {
      sql += " AND a.program_discipline LIKE '%Pharmacy%'";
      appliedFilters.push('Discipline: Pharmacy');
    } else if (q.includes('management') || q.includes('mba')) {
      sql += " AND a.program_discipline LIKE '%Management%'";
      appliedFilters.push('Discipline: Management');
    }

    // Direct text search if specific name or code is mentioned
    const words = q.split(/\s+/).filter(w => w.length > 3 && !['show', 'find', 'list', 'what', 'which', 'overdue', 'applications', 'institute'].includes(w));
    if (words.length > 0 && !appliedFilters.some(f => f.includes('Discipline') || f.includes('Region'))) {
      const kw = `%${words[0]}%`;
      sql += ' AND (i.name LIKE ? OR a.application_number LIKE ?)';
      params.push(kw, kw);
      appliedFilters.push(`Keyword match: "${words[0]}"`);
    }

    sql += ' ORDER BY a.priority_score DESC, a.deadline_at ASC LIMIT 25';

    const results = query<any>(sql, params);

    return {
      query: userQuery,
      interpretedIntent: appliedFilters.length > 0 ? appliedFilters.join(' • ') : 'Standard application directory search',
      totalMatches: results.length,
      results,
    };
  }

  /**
   * Identifies stages with unusual pendency, bottleneck accumulation, and repeated loops
   */
  static detectBottlenecks() {
    // 1. Stage-wise dwell time & volume
    const stageStats = query<any>(`
      SELECT current_stage, 
             count(*) as active_count,
             avg(julianday('now') - julianday(stage_entered_at)) as avg_days_in_stage,
             max(julianday('now') - julianday(stage_entered_at)) as max_days_in_stage
      FROM applications
      WHERE status IN ('ACTIVE', 'PENDING_ACTION')
      GROUP BY current_stage
      ORDER BY active_count DESC
    `);

    // 2. Identify repeat correction loops (applications that bounced back to scrutiny multiple times)
    const repeatLoops = query<any>(`
      SELECT application_id, count(*) as deficiency_rounds
      FROM stage_transitions
      WHERE to_stage = 'DEFICIENCIES_COMMUNICATED'
      GROUP BY application_id
      HAVING deficiency_rounds >= 2
    `);

    // 3. Team workload imbalance
    const officerWorkload = query<any>(`
      SELECT u.id, u.name, u.region, count(a.id) as assigned_applications,
             sum(CASE WHEN a.deadline_at < datetime('now') THEN 1 ELSE 0 END) as overdue_count
      FROM users u
      LEFT JOIN applications a ON u.id = a.assigned_officer_id AND a.status IN ('ACTIVE', 'PENDING_ACTION')
      WHERE u.role IN ('scrutiny_officer', 'regional_officer')
      GROUP BY u.id
      ORDER BY assigned_applications DESC
    `);

    const insights: string[] = [];

    stageStats.forEach(st => {
      const avgDays = Math.round((st.avg_days_in_stage || 0) * 10) / 10;
      if (st.active_count >= 3) {
        insights.push(`Bottleneck Flag: High volume accumulation in "${st.current_stage}" (${st.active_count} applications pending, avg dwell: ${avgDays} days).`);
      }
    });

    if (repeatLoops.length > 0) {
      insights.push(`Repeat Delay Alert: ${repeatLoops.length} application(s) have entered repeated deficiency-correction cycles (>2 rounds of re-scrutiny).`);
    }

    return {
      stageStats: stageStats.map(s => ({
        stage: s.current_stage,
        count: s.active_count,
        avgDays: Math.round((s.avg_days_in_stage || 0) * 10) / 10,
        maxDays: Math.round((s.max_days_in_stage || 0) * 10) / 10,
      })),
      repeatCorrectionCount: repeatLoops.length,
      officerWorkload,
      insights,
    };
  }
}
