import { db, get, query, run, transaction } from '../db/database.js';

export class EscalationEngine {
  /**
   * Calculate transparent, explainable risk score (0 to 100)
   */
  static calculateRiskScore(params: {
    daysOverdue: number;
    currentStage: string;
    openCriticalDeficiencies: number;
    escalationLevel: number;
    hasSchedulingConflict?: boolean;
  }): { score: number; factors: string[] } {
    let score = 10;
    const factors: string[] = ['Baseline application risk (10 pts)'];

    // Overdue duration factor
    if (params.daysOverdue > 0) {
      const overduePts = Math.min(params.daysOverdue * 12, 40);
      score += overduePts;
      factors.push(`${params.daysOverdue} day(s) overdue (+${overduePts} pts)`);
    }

    // Criticality of stage
    if (['SAC_SHC_REVIEW', 'DECISION_PENDING_COMMITTEE'].includes(params.currentStage)) {
      score += 25;
      factors.push(`High-stakes stage [${params.currentStage}] (+25 pts)`);
    } else if (['SCRUTINY_IN_PROGRESS', 'EVC_SCHEDULED'].includes(params.currentStage)) {
      score += 15;
      factors.push(`Active verification stage [${params.currentStage}] (+15 pts)`);
    }

    // Open critical deficiencies
    if (params.openCriticalDeficiencies > 0) {
      const defPts = Math.min(params.openCriticalDeficiencies * 15, 30);
      score += defPts;
      factors.push(`${params.openCriticalDeficiencies} unresolved CRITICAL deficiency (+${defPts} pts)`);
    }

    // Escalation history factor
    if (params.escalationLevel > 0) {
      const escPts = params.escalationLevel * 10;
      score += escPts;
      factors.push(`Escalation Level ${params.escalationLevel} active (+${escPts} pts)`);
    }

    // Scheduling conflict
    if (params.hasSchedulingConflict) {
      score += 20;
      factors.push('EVC Committee scheduling conflict detected (+20 pts)');
    }

    score = Math.min(Math.max(score, 0), 100);
    return { score, factors };
  }

  /**
   * Run the automated SLA checker and escalation rules across the system
   * This is idempotent, deduplicated, and evaluates all applications, documents, and compliance records.
   */
  static runEngine(): {
    alertsGenerated: number;
    escalationsTriggered: number;
    summary: string[];
  } {
    return transaction(() => {
      const now = new Date();
      let alertsGenerated = 0;
      let escalationsTriggered = 0;
      const summary: string[] = [];

      // 1. EVALUATE APPLICATIONS
      const activeApps = query<any>(`
        SELECT a.*, i.name as institution_name, u.name as officer_name, u.role as officer_role
        FROM applications a
        JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN users u ON a.assigned_officer_id = u.id
        WHERE a.status IN ('ACTIVE', 'PENDING_ACTION')
      `);

      for (const app of activeApps) {
        const deadline = new Date(app.deadline_at);
        const msDiff = deadline.getTime() - now.getTime();
        const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        const daysOverdue = daysLeft < 0 ? Math.abs(daysLeft) : 0;

        // Check open critical deficiencies
        const critDefs = query<any>(
          `SELECT count(*) as count FROM scrutiny_observations 
           WHERE application_id = ? AND status = 'OPEN' AND severity = 'CRITICAL'`,
          [app.id]
        );
        const openCritCount = critDefs[0]?.count || 0;

        let escalationLevel = 0;
        let severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL' = 'INFO';
        let targetRole = 'scrutiny_officer';
        let alertTitle = '';
        let alertMessage = '';

        if (daysOverdue > 5) {
          escalationLevel = 3;
          severity = 'CRITICAL';
          targetRole = 'senior_management';
          alertTitle = `[LEVEL 3 ESCALATION] ${app.application_number} Overdue by ${daysOverdue} Days`;
          alertMessage = `Application from ${app.institution_name} has breached stage SLA in "${app.current_stage}" by ${daysOverdue} days. Immediate AICTE Senior Management intervention required.`;
        } else if (daysOverdue > 2) {
          escalationLevel = 2;
          severity = 'URGENT';
          targetRole = 'regional_officer';
          alertTitle = `[LEVEL 2 ESCALATION] ${app.application_number} SLA Breached`;
          alertMessage = `Application in stage "${app.current_stage}" is ${daysOverdue} days overdue. Escalated to Regional Officer for expedited review or reassignment.`;
        } else if (daysOverdue > 0) {
          escalationLevel = 1;
          severity = 'WARNING';
          targetRole = app.assigned_officer_id ? 'scrutiny_officer' : 'regional_officer';
          alertTitle = `[SLA OVERDUE] ${app.application_number} Passed Stage Deadline`;
          alertMessage = `Application has passed its scheduled deadline in "${app.current_stage}". Responsible official should action immediately.`;
        } else if (daysLeft <= 2) {
          escalationLevel = 0;
          severity = 'WARNING';
          targetRole = app.assigned_officer_id ? 'scrutiny_officer' : 'regional_officer';
          alertTitle = `[DEADLINE APPROACHING] ${app.application_number} Due in ${daysLeft} Day(s)`;
          alertMessage = `Application in stage "${app.current_stage}" will breach prescribed SLA within ${daysLeft} day(s).`;
        }

        // Compute risk score
        const { score: riskScore } = this.calculateRiskScore({
          daysOverdue,
          currentStage: app.current_stage,
          openCriticalDeficiencies: openCritCount,
          escalationLevel,
        });

        // Determine risk level category
        let riskLevel = 'LOW';
        if (riskScore >= 75) riskLevel = 'CRITICAL';
        else if (riskScore >= 55) riskLevel = 'HIGH';
        else if (riskScore >= 35) riskLevel = 'MEDIUM';

        // Update application's current risk score and risk level
        run('UPDATE applications SET priority_score = ?, risk_level = ? WHERE id = ?', [riskScore, riskLevel, app.id]);

        // If an alert or escalation condition exists, insert deduplicated alert
        if (alertTitle) {
          const dedupKey = `APP_${app.id}_L${escalationLevel}_${daysOverdue > 0 ? 'OVERDUE' : 'APPROACHING'}`;
          const existingAlert = get<any>('SELECT id, is_resolved FROM alerts WHERE dedup_key = ?', [dedupKey]);

          if (!existingAlert) {
            const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            run(
              `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, responsible_user_id, deadline_at, escalation_level, risk_score, dedup_key, created_at)
               VALUES (?, ?, 'APPLICATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                alertId,
                `ALT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                app.id,
                app.institution_id,
                severity,
                alertTitle,
                alertMessage,
                targetRole,
                app.assigned_officer_id,
                app.deadline_at,
                escalationLevel,
                riskScore,
                dedupKey,
                now.toISOString(),
              ]
            );
            alertsGenerated++;
            if (escalationLevel > 0) escalationsTriggered++;
            summary.push(`Application ${app.application_number}: ${alertTitle}`);
          }
        }
      }

      // 2. EVALUATE COMPLIANCE OBLIGATIONS
      const pendingObligations = query<any>(`
        SELECT c.*, i.name as institution_name
        FROM compliance_obligations c
        JOIN institutions i ON c.institution_id = i.id
        WHERE c.status IN ('CREATED', 'AWAITING_SUBMISSION', 'DEFICIENT_RETURNED')
      `);

      for (const ob of pendingObligations) {
        const dueDate = new Date(ob.due_date);
        const msDiff = dueDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        const daysOverdue = daysLeft < 0 ? Math.abs(daysLeft) : 0;

        if (daysOverdue > 0) {
          // Update status to OVERDUE or ESCALATED
          const newEscLevel = daysOverdue > 7 ? 2 : 1;
          const newStatus = daysOverdue > 7 ? 'ESCALATED' : 'OVERDUE';
          run(
            `UPDATE compliance_obligations SET status = ?, escalation_level = ? WHERE id = ?`,
            [newStatus, newEscLevel, ob.id]
          );

          const dedupKey = `COMP_${ob.id}_L${newEscLevel}_OVERDUE`;
          const existing = get<any>('SELECT id FROM alerts WHERE dedup_key = ?', [dedupKey]);
          if (!existing) {
            const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            run(
              `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, deadline_at, escalation_level, risk_score, dedup_key, created_at)
               VALUES (?, ?, 'COMPLIANCE_OBLIGATION', ?, ?, 'CRITICAL', ?, ?, ?, ?, ?, 80, ?, ?)`,
              [
                alertId,
                `ALT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                ob.id,
                ob.institution_id,
                `[COMPLIANCE OVERDUE] Obligation ${ob.obligation_code}: ${ob.title}`,
                `${ob.institution_name} failed to submit mandatory compliance undertaking by deadline. Overdue by ${daysOverdue} days.`,
                newEscLevel === 2 ? 'regional_officer' : 'scrutiny_officer',
                ob.due_date,
                newEscLevel,
                dedupKey,
                now.toISOString(),
              ]
            );
            alertsGenerated++;
            escalationsTriggered++;
            summary.push(`Compliance ${ob.obligation_code}: Overdue by ${daysOverdue}d`);
          }
        }
      }

      // 3. EVALUATE DOCUMENT VALIDITY & EXPIRATION
      const docs = query<any>(`
        SELECT d.*, i.name as institution_name
        FROM documents d
        JOIN institutions i ON d.institution_id = i.id
        WHERE d.expiry_date IS NOT NULL AND d.verification_status != 'EXPIRED'
      `);

      for (const doc of docs) {
        const expDate = new Date(doc.expiry_date);
        const msDiff = expDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          // Document Expired!
          run(`UPDATE documents SET verification_status = 'EXPIRED' WHERE id = ?`, [doc.id]);
          const dedupKey = `DOC_${doc.id}_EXPIRED`;
          if (!get<any>('SELECT id FROM alerts WHERE dedup_key = ?', [dedupKey])) {
            const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            run(
              `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, deadline_at, escalation_level, risk_score, dedup_key, created_at)
               VALUES (?, ?, 'DOCUMENT', ?, ?, 'CRITICAL', ?, ?, 'institution_admin', ?, 2, 85, ?, ?)`,
              [
                alertId,
                `ALT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                doc.id,
                doc.institution_id,
                `[DOCUMENT EXPIRED] ${doc.document_type} Expired`,
                `Prescribed regulatory document "${doc.document_name}" for ${doc.institution_name} has expired. Immediate renewal submission mandatory.`,
                doc.expiry_date,
                dedupKey,
                now.toISOString(),
              ]
            );
            alertsGenerated++;
            escalationsTriggered++;
          }
        } else if (daysLeft <= 30) {
          // Document Expiring Soon Advance Reminder
          const dedupKey = `DOC_${doc.id}_EXPIRING_30D`;
          if (!get<any>('SELECT id FROM alerts WHERE dedup_key = ?', [dedupKey])) {
            const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            run(
              `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, deadline_at, escalation_level, risk_score, dedup_key, created_at)
               VALUES (?, ?, 'DOCUMENT', ?, ?, 'WARNING', ?, ?, 'institution_admin', ?, 0, 45, ?, ?)`,
              [
                alertId,
                `ALT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                doc.id,
                doc.institution_id,
                `[RENEWAL WARNING] ${doc.document_type} Expiring in ${daysLeft} Days`,
                `Document "${doc.document_name}" will expire on ${doc.expiry_date}. Institution must initiate renewal to avoid compliance violation.`,
                doc.expiry_date,
                dedupKey,
                now.toISOString(),
              ]
            );
            alertsGenerated++;
          }
        }
      }

      // 4. EVALUATE EVC SCHEDULING CONFLICTS
      const visits = query<any>(`
        SELECT ev.*, i.name as institution_name
        FROM evc_visits ev
        JOIN institutions i ON ev.institution_id = i.id
        WHERE ev.visit_status IN ('PENDING_SCHEDULING', 'SCHEDULED', 'CONFLICT_DETECTED')
      `);

      for (const visit of visits) {
        if (visit.visit_status === 'CONFLICT_DETECTED') {
          const dedupKey = `EVC_${visit.id}_CONFLICT`;
          if (!get<any>('SELECT id FROM alerts WHERE dedup_key = ?', [dedupKey])) {
            const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            run(
              `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, deadline_at, escalation_level, risk_score, dedup_key, created_at)
               VALUES (?, ?, 'EVC_VISIT', ?, ?, 'CRITICAL', ?, ?, 'evc_coordinator', ?, 2, 75, ?, ?)`,
              [
                alertId,
                `ALT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                visit.id,
                visit.institution_id,
                `[EVC SCHEDULING CONFLICT] Visit ${visit.visit_code}`,
                `Conflict detected for ${visit.institution_name}: ${visit.conflict_details || 'Committee member assigned to multiple overlapping inspections'}.`,
                visit.proposed_date,
                dedupKey,
                now.toISOString(),
              ]
            );
            alertsGenerated++;
            escalationsTriggered++;
          }
        }
      }

      return {
        alertsGenerated,
        escalationsTriggered,
        summary,
      };
    });
  }

  /**
   * Acknowledge an escalation alert by an authorized supervisor
   */
  static acknowledgeAlert(params: {
    alertId: string;
    userId: string;
    userName: string;
    userRole: string;
    notes: string;
  }) {
    return transaction(() => {
      const alert = get<any>('SELECT * FROM alerts WHERE id = ?', [params.alertId]);
      if (!alert) {
        throw new Error(`Alert ${params.alertId} not found.`);
      }

      const now = new Date().toISOString();
      run(
        `UPDATE alerts
         SET is_acknowledged = 1,
             acknowledged_by = ?,
             acknowledged_at = ?,
             acknowledgement_notes = ?
         WHERE id = ?`,
        [params.userId, now, params.notes, params.alertId]
      );

      // Audit log
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          params.userId,
          params.userName,
          params.userRole,
          'ALERT_ACKNOWLEDGED',
          'ALERT',
          params.alertId,
          JSON.stringify({
            title: alert.title,
            escalationLevel: alert.escalation_level,
            notes: params.notes,
          }),
          now,
        ]
      );

      return { success: true, alertId: params.alertId, acknowledgedAt: now };
    });
  }
}
