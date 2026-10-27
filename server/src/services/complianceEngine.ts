import { db, get, query, run, transaction } from '../db/database.js';

export class ComplianceEngine {
  /**
   * Submit institutional evidence against a compliance obligation
   * Note: As per AICTE requirements, uploading evidence does NOT automatically mark it fulfilled!
   * It transitions status to 'SUBMITTED' (or 'UNDER_REVIEW') awaiting authorized officer scrutiny.
   */
  static submitEvidence(params: {
    obligationId: string;
    institutionId: string;
    evidenceDocumentId: string;
    submissionNotes: string;
    actorId: string;
    actorName: string;
    actorRole: string;
  }) {
    return transaction(() => {
      const obligation = get<any>('SELECT * FROM compliance_obligations WHERE id = ?', [params.obligationId]);
      if (!obligation) {
        throw new Error(`Compliance obligation ${params.obligationId} not found.`);
      }

      if (params.actorRole === 'institution_admin' && obligation.institution_id !== params.institutionId) {
        throw new Error('Unauthorized: You cannot submit compliance evidence for another institution.');
      }

      const now = new Date().toISOString();

      // Update obligation to SUBMITTED
      run(
        `UPDATE compliance_obligations
         SET status = 'SUBMITTED',
             evidence_document_id = ?,
             submission_notes = ?,
             submitted_at = ?
         WHERE id = ?`,
        [params.evidenceDocumentId, params.submissionNotes, now, params.obligationId]
      );

      // Audit log
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          params.actorId,
          params.actorName,
          params.actorRole,
          'COMPLIANCE_EVIDENCE_SUBMITTED',
          'COMPLIANCE_OBLIGATION',
          params.obligationId,
          JSON.stringify({
            title: obligation.title,
            evidenceDocumentId: params.evidenceDocumentId,
            notes: params.submissionNotes,
          }),
          now,
        ]
      );

      return {
        success: true,
        message: 'Evidence submitted successfully. It is now queued for authorized officer verification.',
      };
    });
  }

  /**
   * Authorized Officer reviews compliance evidence and accepts or returns for corrections
   */
  static reviewEvidence(params: {
    obligationId: string;
    decision: 'ACCEPT' | 'RETURN_DEFICIENT';
    reviewerId: string;
    reviewerName: string;
    reviewerRole: string;
    reviewerNotes: string;
  }) {
    return transaction(() => {
      const allowedRoles = ['scrutiny_officer', 'regional_officer', 'super_admin'];
      if (!allowedRoles.includes(params.reviewerRole)) {
        throw new Error(`Role "${params.reviewerRole}" is not authorized to review compliance obligations.`);
      }

      const obligation = get<any>('SELECT * FROM compliance_obligations WHERE id = ?', [params.obligationId]);
      if (!obligation) {
        throw new Error(`Compliance obligation ${params.obligationId} not found.`);
      }

      const now = new Date().toISOString();
      const newStatus = params.decision === 'ACCEPT' ? 'FULFILLED_ACCEPTED' : 'DEFICIENT_RETURNED';

      run(
        `UPDATE compliance_obligations
         SET status = ?,
             reviewer_id = ?,
             reviewer_notes = ?,
             reviewed_at = ?
         WHERE id = ?`,
        [newStatus, params.reviewerId, params.reviewerNotes, now, params.obligationId]
      );

      // If accepted, also mark linked document as VERIFIED
      if (params.decision === 'ACCEPT' && obligation.evidence_document_id) {
        run(
          `UPDATE documents
           SET verification_status = 'VERIFIED',
               verified_by_officer_id = ?,
               verified_at = ?
           WHERE id = ?`,
          [params.reviewerId, now, obligation.evidence_document_id]
        );

        // Resolve any active alerts for this obligation
        run(
          `UPDATE alerts
           SET is_resolved = 1, resolved_at = ?, resolution_action = 'Obligation verified and accepted by officer'
           WHERE entity_id = ? AND entity_type = 'COMPLIANCE_OBLIGATION' AND is_resolved = 0`,
          [now, params.obligationId]
        );
      } else if (params.decision === 'RETURN_DEFICIENT') {
        // Create an alert informing institution that compliance submission was returned
        const alertId = `ALT-DEF-${Date.now()}`;
        run(
          `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, responsible_user_id, deadline_at, escalation_level, risk_score, created_at)
           VALUES (?, ?, 'COMPLIANCE_OBLIGATION', ?, ?, 'URGENT', ?, ?, 'institution_admin', NULL, ?, 1, 65, ?)`,
          [
            alertId,
            `ALT-${Date.now().toString().slice(-6)}`,
            params.obligationId,
            obligation.institution_id,
            `Compliance Rectification Required: ${obligation.title}`,
            `Reviewer noted deficiencies: "${params.reviewerNotes}". Please resubmit corrected evidence.`,
            obligation.due_date,
            now,
          ]
        );
      }

      // Tamper-evident audit log
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          params.reviewerId,
          params.reviewerName,
          params.reviewerRole,
          params.decision === 'ACCEPT' ? 'COMPLIANCE_ACCEPTED' : 'COMPLIANCE_DEFICIENT_RETURNED',
          'COMPLIANCE_OBLIGATION',
          params.obligationId,
          JSON.stringify({
            title: obligation.title,
            decision: params.decision,
            newStatus,
            reviewerNotes: params.reviewerNotes,
          }),
          now,
        ]
      );

      return {
        success: true,
        status: newStatus,
        reviewedAt: now,
      };
    });
  }

  /**
   * Replace a document (versioning: preserves v1, creates v2, links replacement)
   */
  static replaceDocument(params: {
    previousDocId: string;
    institutionId: string;
    documentType: string;
    documentName: string;
    filePath: string;
    fileSize: number;
    issueDate?: string;
    expiryDate?: string;
    actorId: string;
    actorName: string;
    actorRole: string;
  }) {
    return transaction(() => {
      const prevDoc = get<any>('SELECT * FROM documents WHERE id = ?', [params.previousDocId]);
      if (!prevDoc) {
        throw new Error(`Previous document with ID ${params.previousDocId} not found.`);
      }

      const nextVersion = (prevDoc.version || 1) + 1;
      const newDocId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      // Create new document record with incremented version and link to previous
      run(
        `INSERT INTO documents (id, institution_id, application_id, obligation_id, document_type, document_name, file_path, file_size, mime_type, version, issue_date, expiry_date, verification_status, replacement_of_doc_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?, 'PENDING', ?, ?)`,
        [
          newDocId,
          params.institutionId,
          prevDoc.application_id,
          prevDoc.obligation_id,
          params.documentType || prevDoc.document_type,
          params.documentName,
          params.filePath,
          params.fileSize || 102400,
          nextVersion,
          params.issueDate || null,
          params.expiryDate || null,
          prevDoc.id,
          now,
        ]
      );

      // Mark old document as superseded/renewal-replaced
      run(
        `UPDATE documents SET notes = ? WHERE id = ?`,
        [`Superseded by version ${nextVersion} (${newDocId}) on ${now}`, prevDoc.id]
      );

      // Audit log
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          params.actorId,
          params.actorName,
          params.actorRole,
          'DOCUMENT_REPLACED_VERSIONED',
          'DOCUMENT',
          newDocId,
          JSON.stringify({
            previousDocId: prevDoc.id,
            previousVersion: prevDoc.version,
            newVersion: nextVersion,
            documentType: prevDoc.document_type,
            expiryDate: params.expiryDate,
          }),
          now,
        ]
      );

      return {
        success: true,
        newDocumentId: newDocId,
        version: nextVersion,
      };
    });
  }
}
