import { db, get, query, run, transaction } from '../db/database.js';

export interface WorkflowStageDef {
  stage: string;
  name: string;
  description: string;
  slaDays: number;
  allowedNextStages: string[];
  allowedRoles: string[];
  mandatoryChecklist: string[];
}

export const WORKFLOW_STAGES: Record<string, WorkflowStageDef> = {
  DRAFT: {
    stage: 'DRAFT',
    name: 'Draft Application',
    description: 'Application prepared by technical institution prior to formal submission.',
    slaDays: 30,
    allowedNextStages: ['SUBMITTED'],
    allowedRoles: ['institution_admin', 'super_admin'],
    mandatoryChecklist: ['Institution profile verified', 'Mandatory disclosures uploaded', 'Processing fee paid'],
  },
  SUBMITTED: {
    stage: 'SUBMITTED',
    name: 'Application Submitted',
    description: 'Submitted to Regional Office, queued for preliminary scrutiny.',
    slaDays: 3,
    allowedNextStages: ['PRELIMINARY_SCRUTINY', 'WITHDRAWN'],
    allowedRoles: ['regional_officer', 'super_admin'],
    mandatoryChecklist: ['Digital signature authenticated', 'Initial document pack intact'],
  },
  PRELIMINARY_SCRUTINY: {
    stage: 'PRELIMINARY_SCRUTINY',
    name: 'Preliminary Scrutiny',
    description: 'Initial verification of land, building fitness, and statutory permissions.',
    slaDays: 5,
    allowedNextStages: ['SCRUTINY_IN_PROGRESS', 'DEFICIENCIES_COMMUNICATED'],
    allowedRoles: ['regional_officer', 'scrutiny_officer', 'super_admin'],
    mandatoryChecklist: ['Land registry valid', 'Society/Trust registration valid', 'Essential certificates verified'],
  },
  SCRUTINY_IN_PROGRESS: {
    stage: 'SCRUTINY_IN_PROGRESS',
    name: 'Detailed Scrutiny In Progress',
    description: 'Scrutiny Officer is conducting line-item review of faculty cadre ratio, labs, and funds.',
    slaDays: 7,
    allowedNextStages: ['DEFICIENCIES_COMMUNICATED', 'EVC_RECOMMENDED', 'DECISION_PENDING_COMMITTEE'],
    allowedRoles: ['scrutiny_officer', 'regional_officer', 'super_admin'],
    mandatoryChecklist: ['Faculty cadre verification complete', 'Infrastructure calculations validated', 'Audited balance sheet verified'],
  },
  DEFICIENCIES_COMMUNICATED: {
    stage: 'DEFICIENCIES_COMMUNICATED',
    name: 'Deficiencies Communicated',
    description: 'Specific non-compliances issued to institution with time-bound response window.',
    slaDays: 2,
    allowedNextStages: ['AWAITING_INSTITUTION_RESPONSE'],
    allowedRoles: ['scrutiny_officer', 'regional_officer', 'super_admin'],
    mandatoryChecklist: ['Formal deficiency letter generated', 'Rule citations mapped to APH 2026-27'],
  },
  AWAITING_INSTITUTION_RESPONSE: {
    stage: 'AWAITING_INSTITUTION_RESPONSE',
    name: 'Awaiting Institution Response',
    description: 'Institution must rectify deficiencies and upload documentary proof before deadline.',
    slaDays: 14,
    allowedNextStages: ['RE_SCRUTINY_PENDING'],
    allowedRoles: ['institution_admin', 'super_admin'],
    mandatoryChecklist: ['Point-wise institutional explanation attached', 'Supporting compliance documents uploaded'],
  },
  RE_SCRUTINY_PENDING: {
    stage: 'RE_SCRUTINY_PENDING',
    name: 'Re-Scrutiny Pending',
    description: 'Scrutiny committee re-evaluates institutional rectification submissions.',
    slaDays: 5,
    allowedNextStages: ['SCRUTINY_IN_PROGRESS', 'DEFICIENCIES_COMMUNICATED', 'EVC_RECOMMENDED', 'DECISION_PENDING_COMMITTEE'],
    allowedRoles: ['scrutiny_officer', 'regional_officer', 'super_admin'],
    mandatoryChecklist: ['All prior open deficiency items verified', 'Re-scrutiny remarks recorded'],
  },
  EVC_RECOMMENDED: {
    stage: 'EVC_RECOMMENDED',
    name: 'EVC Recommended',
    description: 'Application approved for physical or hybrid Expert Visit Committee inspection.',
    slaDays: 5,
    allowedNextStages: ['EVC_SCHEDULED'],
    allowedRoles: ['regional_officer', 'evc_coordinator', 'super_admin'],
    mandatoryChecklist: ['Inspection parameters formulated', 'Eligible committee panel shortlisted'],
  },
  EVC_SCHEDULED: {
    stage: 'EVC_SCHEDULED',
    name: 'EVC Visit Scheduled',
    description: 'Committee members appointed, date confirmed, visit itinerary issued to institute.',
    slaDays: 10,
    allowedNextStages: ['EVC_COMPLETED', 'EVC_RECOMMENDED'],
    allowedRoles: ['evc_coordinator', 'super_admin'],
    mandatoryChecklist: ['Chairman & members accepted appointment', 'No scheduling conflict found', 'Visit logistics communicated'],
  },
  EVC_COMPLETED: {
    stage: 'EVC_COMPLETED',
    name: 'EVC Visit Completed',
    description: 'On-site committee submitted signed inspection report and geolocated photo evidence.',
    slaDays: 3,
    allowedNextStages: ['SAC_SHC_REVIEW', 'DECISION_PENDING_COMMITTEE'],
    allowedRoles: ['evc_coordinator', 'regional_officer', 'super_admin'],
    mandatoryChecklist: ['EVC report uploaded and countersigned', 'Videography and geotagged records archived'],
  },
  SAC_SHC_REVIEW: {
    stage: 'SAC_SHC_REVIEW',
    name: 'SAC / SHC Review',
    description: 'Standing Appeals Committee / Standing Hearing Committee hearing institutional representation.',
    slaDays: 10,
    allowedNextStages: ['DECISION_PENDING_COMMITTEE', 'RE_SCRUTINY_PENDING'],
    allowedRoles: ['regional_officer', 'senior_management', 'super_admin'],
    mandatoryChecklist: ['Hearing minutes recorded', 'SAC committee recommendation finalized'],
  },
  DECISION_PENDING_COMMITTEE: {
    stage: 'DECISION_PENDING_COMMITTEE',
    name: 'Decision Pending with Competent Authority',
    description: 'Final appraisal submitted to Regional Committee / Executive Committee for statutory order.',
    slaDays: 5,
    allowedNextStages: ['APPROVED', 'REJECTED'],
    allowedRoles: ['senior_management', 'super_admin'],
    mandatoryChecklist: ['Complete dossier audited', 'Compliance clearance verified', 'Competent authority quorum met'],
  },
  APPROVED: {
    stage: 'APPROVED',
    name: 'Approval Granted (EoA / LoA Issued)',
    description: 'Official AICTE Approval Order issued for academic year 2026-2027.',
    slaDays: 0,
    allowedNextStages: [],
    allowedRoles: ['senior_management', 'super_admin'],
    mandatoryChecklist: ['Approval Letter digitally signed', 'Permanent portal update completed'],
  },
  REJECTED: {
    stage: 'REJECTED',
    name: 'Application Rejected',
    description: 'Application rejected under relevant APH clauses with speaking order issued.',
    slaDays: 0,
    allowedNextStages: ['SAC_SHC_REVIEW'], // Can appeal to SAC
    allowedRoles: ['senior_management', 'super_admin'],
    mandatoryChecklist: ['Speaking rejection order recorded', 'Right to appeal notice issued'],
  },
  WITHDRAWN: {
    stage: 'WITHDRAWN',
    name: 'Application Withdrawn',
    description: 'Application withdrawn upon formal institutional request.',
    slaDays: 0,
    allowedNextStages: [],
    allowedRoles: ['institution_admin', 'super_admin'],
    mandatoryChecklist: ['Governing body withdrawal resolution submitted'],
  },
};

export class WorkflowEngine {
  /**
   * Validate if a transition from currentStage to nextStage is permissible for the given user role
   */
  static validateTransition(
    currentStage: string,
    nextStage: string,
    userRole: string
  ): { valid: boolean; reason?: string } {
    const currentDef = WORKFLOW_STAGES[currentStage];
    if (!currentDef) {
      return { valid: false, reason: `Invalid current stage: "${currentStage}"` };
    }

    if (!WORKFLOW_STAGES[nextStage]) {
      return { valid: false, reason: `Target stage "${nextStage}" does not exist in the approval workflow.` };
    }

    if (!currentDef.allowedNextStages.includes(nextStage)) {
      return {
        valid: false,
        reason: `Cannot transition directly from "${currentDef.name}" to "${WORKFLOW_STAGES[nextStage].name}". Permitted next stages are: ${currentDef.allowedNextStages.map(s => WORKFLOW_STAGES[s]?.name || s).join(', ')}.`,
      };
    }

    // Role check (super_admin can perform any permitted transition)
    if (userRole !== 'super_admin') {
      const targetAllowedRoles = currentDef.allowedRoles;
      if (!targetAllowedRoles.includes(userRole)) {
        return {
          valid: false,
          reason: `Role "${userRole}" is not authorized to transition an application out of "${currentDef.name}". Required roles: ${targetAllowedRoles.join(', ')}.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute stage transition with full transaction, audit logging, and SLA recalculation
   */
  static executeTransition(params: {
    applicationId: string;
    targetStage: string;
    actionTaken: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    remarks?: string;
    checklistAnswers?: string[];
  }) {
    return transaction(() => {
      const app = get<any>('SELECT * FROM applications WHERE id = ?', [params.applicationId]);
      if (!app) {
        throw new Error(`Application with ID ${params.applicationId} not found.`);
      }

      const validation = this.validateTransition(app.current_stage, params.targetStage, params.actorRole);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      // Check for unaddressed critical deficiencies if moving to approval or committee decision
      if (['DECISION_PENDING_COMMITTEE', 'APPROVED'].includes(params.targetStage)) {
        const openCriticalDeficiencies = query<any>(
          `SELECT count(*) as count FROM scrutiny_observations 
           WHERE application_id = ? AND status = 'OPEN' AND severity = 'CRITICAL'`,
          [params.applicationId]
        );
        if (openCriticalDeficiencies[0]?.count > 0) {
          throw new Error(`Cannot advance to ${params.targetStage}: Application has ${openCriticalDeficiencies[0].count} unaddressed CRITICAL deficiency observation(s).`);
        }
      }

      const targetDef = WORKFLOW_STAGES[params.targetStage];
      const now = new Date();
      const newDeadline = new Date(now.getTime() + (targetDef.slaDays || 7) * 24 * 60 * 60 * 1000);

      // 1. Record stage transition history
      const transitionId = `TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      run(
        `INSERT INTO stage_transitions (id, application_id, from_stage, to_stage, action_taken, actor_id, actor_name, actor_role, remarks, prerequisites_verified, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transitionId,
          params.applicationId,
          app.current_stage,
          params.targetStage,
          params.actionTaken,
          params.actorId,
          params.actorName,
          params.actorRole,
          params.remarks || `Advanced to ${targetDef.name}`,
          JSON.stringify(params.checklistAnswers || targetDef.mandatoryChecklist),
          now.toISOString(),
        ]
      );

      // 2. Update Application Status
      let newStatus = 'ACTIVE';
      if (params.targetStage === 'APPROVED') newStatus = 'APPROVED';
      else if (params.targetStage === 'REJECTED') newStatus = 'REJECTED';
      else if (params.targetStage === 'WITHDRAWN') newStatus = 'WITHDRAWN';
      else if (params.targetStage === 'AWAITING_INSTITUTION_RESPONSE') newStatus = 'PENDING_ACTION';

      run(
        `UPDATE applications 
         SET current_stage = ?,
             status = ?,
             stage_entered_at = ?,
             deadline_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          params.targetStage,
          newStatus,
          now.toISOString(),
          newDeadline.toISOString(),
          now.toISOString(),
          params.applicationId,
        ]
      );

      // 3. Mark old application stage alerts as resolved so they don't linger
      run(
        `UPDATE alerts 
         SET is_resolved = 1, resolved_at = ?, resolution_action = ?
         WHERE entity_id = ? AND entity_type = 'APPLICATION' AND is_resolved = 0`,
        [now.toISOString(), `Resolved by stage transition to ${params.targetStage}`, params.applicationId]
      );

      // 4. Record tamper-evident audit log
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          params.actorId,
          params.actorName,
          params.actorRole,
          'WORKFLOW_STAGE_TRANSITION',
          'APPLICATION',
          params.applicationId,
          JSON.stringify({
            application_number: app.application_number,
            from_stage: app.current_stage,
            to_stage: params.targetStage,
            remarks: params.remarks,
            deadline: newDeadline.toISOString(),
          }),
          now.toISOString(),
        ]
      );

      return {
        success: true,
        previousStage: app.current_stage,
        currentStage: params.targetStage,
        deadline: newDeadline.toISOString(),
        transitionId,
      };
    });
  }
}
