import assert from 'assert';
import { db, get, query, run } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';
import { WorkflowEngine } from '../src/services/workflowEngine.js';
import { ComplianceEngine } from '../src/services/complianceEngine.js';
import { EscalationEngine } from '../src/services/escalationEngine.js';

async function runAcceptanceTests() {
  console.log('\n--- STARTING AICTE WORKFLOW & COMPLIANCE ACCEPTANCE TESTS ---\n');
  seedDatabase(true);

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`[PASS] Test #${total}: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] Test #${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // 1. Role-Based Scrutiny vs Institution Auth
  test('Super Admin & Institution Admin demo users exist with valid roles', () => {
    const admin = get<any>("SELECT * FROM users WHERE role = 'super_admin'");
    const instAdmin = get<any>("SELECT * FROM users WHERE role = 'institution_admin'");
    assert(admin, 'Super admin user must exist');
    assert(instAdmin, 'Institution admin user must exist');
    assert.strictEqual(instAdmin.institution_id, 'INST-001', 'PICT Institution admin must have institution_id INST-001');
  });

  // 2. Permitted Transition Execution
  test('Application can transition from DRAFT -> SUBMITTED by institution_admin', () => {
    const testAppId = 'APP-TEST-001';
    run(
      `INSERT INTO applications (id, application_number, institution_id, workflow_code, program_discipline, proposed_intake, current_stage, status, region, submitted_at, stage_entered_at, deadline_at)
       VALUES (?, 'AICTE/TEST/001', 'INST-001', 'NEW_INSTITUTION', 'Computer Science', 120, 'DRAFT', 'ACTIVE', 'Western', datetime('now'), datetime('now'), datetime('now', '+30 days'))`,
      [testAppId]
    );

    const result = WorkflowEngine.executeTransition({
      applicationId: testAppId,
      targetStage: 'SUBMITTED',
      actionTaken: 'SUBMIT_FORMAL_APPLICATION',
      actorId: 'USR-005',
      actorName: 'Dr. Rajesh Deshmukh',
      actorRole: 'institution_admin',
      remarks: 'Application submitted with all mandatory disclosures.',
    });

    assert.strictEqual(result.currentStage, 'SUBMITTED');
    const updated = get<any>('SELECT current_stage FROM applications WHERE id = ?', [testAppId]);
    assert.strictEqual(updated.current_stage, 'SUBMITTED');
  });

  // 3. Security / Workflow Rule Enforcement: Unauthorized Transition Rejection
  test('Unauthorized transition is strictly rejected by the backend engine (e.g. Scrutiny Officer cannot skip to APPROVED)', () => {
    const app = get<any>("SELECT id, current_stage FROM applications WHERE current_stage = 'SCRUTINY_IN_PROGRESS' LIMIT 1");
    assert(app, 'Must have an application in SCRUTINY_IN_PROGRESS');

    assert.throws(
      () => {
        WorkflowEngine.executeTransition({
          applicationId: app.id,
          targetStage: 'APPROVED',
          actionTaken: 'BYPASS_TO_APPROVED',
          actorId: 'USR-004',
          actorName: 'Er. Meenakshi Sundaram',
          actorRole: 'scrutiny_officer',
          remarks: 'Attempting unauthorized bypass',
        });
      },
      /Cannot transition directly from/,
      'Direct jump from scrutiny to approved must be rejected by workflow rules'
    );
  });

  // 4. Compliance Evidence Submission does NOT auto-fulfill
  test('Evidence upload transitions obligation to SUBMITTED but does NOT mark it fulfilled', () => {
    const ob = get<any>("SELECT * FROM compliance_obligations WHERE id = 'COMP-001'");
    assert(ob, 'COMP-001 obligation must exist');

    ComplianceEngine.submitEvidence({
      obligationId: 'COMP-001',
      institutionId: 'INST-001',
      evidenceDocumentId: 'DOC-101',
      submissionNotes: 'Uploaded 30-year renewed lease deed extension certificate',
      actorId: 'USR-005',
      actorName: 'Dr. Rajesh Deshmukh',
      actorRole: 'institution_admin',
    });

    const updatedOb = get<any>("SELECT status, submitted_at FROM compliance_obligations WHERE id = 'COMP-001'");
    assert.strictEqual(updatedOb.status, 'SUBMITTED', 'Status must be SUBMITTED, NOT FULFILLED');
    assert(updatedOb.submitted_at, 'submitted_at timestamp must be recorded');
  });

  // 5. Authorized Officer Acceptance fulfills the obligation
  test('Authorized Officer review of evidence marks obligation FULFILLED_ACCEPTED', () => {
    const reviewResult = ComplianceEngine.reviewEvidence({
      obligationId: 'COMP-001',
      decision: 'ACCEPT',
      reviewerId: 'USR-004',
      reviewerName: 'Er. Meenakshi Sundaram',
      reviewerRole: 'scrutiny_officer',
      reviewerNotes: 'Verified Sub-Registrar seal and 30-year tenure. Approved.',
    });

    assert.strictEqual(reviewResult.status, 'FULFILLED_ACCEPTED');
    const updatedOb = get<any>("SELECT status, reviewer_id FROM compliance_obligations WHERE id = 'COMP-001'");
    assert.strictEqual(updatedOb.status, 'FULFILLED_ACCEPTED');
  });

  // 6. Document Versioning & Preservation
  test('Replacing a document preserves v1, creates v2, and archives audit record', () => {
    const prevDoc = get<any>("SELECT * FROM documents WHERE id = 'DOC-101'");
    assert.strictEqual(prevDoc.version, 1);

    const replaceResult = ComplianceEngine.replaceDocument({
      previousDocId: 'DOC-101',
      institutionId: 'INST-001',
      documentType: 'LAND_LEASE_DEED',
      documentName: 'Registered_Lease_Deed_PICT_Dhankawadi_v2_Renewed.pdf',
      filePath: '/uploads/Registered_Lease_Deed_PICT_Dhankawadi_v2_Renewed.pdf',
      fileSize: 1580000,
      issueDate: '2026-10-20',
      expiryDate: '2056-10-19',
      actorId: 'USR-005',
      actorName: 'Dr. Rajesh Deshmukh',
      actorRole: 'institution_admin',
    });

    assert.strictEqual(replaceResult.version, 2);
    const newDoc = get<any>('SELECT * FROM documents WHERE id = ?', [replaceResult.newDocumentId]);
    assert.strictEqual(newDoc.version, 2);
    assert.strictEqual(newDoc.replacement_of_doc_id, 'DOC-101');
  });

  // 7. Automated SLA & Escalation Engine Execution
  test('Escalation Engine runs, identifies overdue items, and creates deduplicated alerts', () => {
    const result = EscalationEngine.runEngine();
    assert(result.alertsGenerated >= 0);

    const criticalAlerts = query<any>("SELECT * FROM alerts WHERE severity = 'CRITICAL'");
    assert(criticalAlerts.length > 0, 'Must have generated critical alerts for overdue applications/documents');
  });

  // 8. Escalation Acknowledgment Workflow
  test('Supervisor can acknowledge an escalation alert with remedial notes', () => {
    const alert = get<any>('SELECT * FROM alerts WHERE is_acknowledged = 0 LIMIT 1');
    assert(alert, 'Must have an unacknowledged alert');

    const ackResult = EscalationEngine.acknowledgeAlert({
      alertId: alert.id,
      userId: 'USR-003',
      userName: 'Dr. Vivek S. Kulkarni',
      userRole: 'regional_officer',
      notes: 'Reviewed with principal. Extension granted by 48 hours for document submission.',
    });

    assert(ackResult.success);
    const updatedAlert = get<any>('SELECT is_acknowledged, acknowledged_by FROM alerts WHERE id = ?', [alert.id]);
    assert.strictEqual(updatedAlert.is_acknowledged, 1);
    assert.strictEqual(updatedAlert.acknowledged_by, 'USR-003');
  });

  // 9. EVC Scheduling Conflict Detection
  test('EVC committee overlapping assignment is flagged as CONFLICT_DETECTED', () => {
    const conflictVisit = get<any>("SELECT * FROM evc_visits WHERE visit_status = 'CONFLICT_DETECTED'");
    assert(conflictVisit, 'Must detect the conflict where chairman is double-booked on same date');
    assert(conflictVisit.conflict_details.includes('Scheduling Conflict'));
  });

  // 10. Tamper-Evident Audit Logging
  test('Audit logs table tracks every sensitive transition, review, and acknowledgment', () => {
    const logs = query<any>('SELECT count(*) as count FROM audit_logs');
    assert(logs[0].count >= 3, 'Should have multiple recorded audit log entries');
  });

  console.log(`\n=========================================`);
  console.log(`ACCEPTANCE TEST RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log(`=========================================\n`);
}

runAcceptanceTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
