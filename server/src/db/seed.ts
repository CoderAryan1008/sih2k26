import bcrypt from 'bcryptjs';
import { db, run, query, initDatabase } from './database.js';

export function seedDatabase(forceReset: boolean = false) {
  initDatabase();

  if (forceReset) {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM alerts;
      DELETE FROM evc_visits;
      DELETE FROM documents;
      DELETE FROM compliance_obligations;
      DELETE FROM scrutiny_observations;
      DELETE FROM stage_transitions;
      DELETE FROM applications;
      DELETE FROM workflow_templates;
      DELETE FROM users;
      DELETE FROM institutions;
    `);
  }

  // Check if already seeded
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as any;
  if (userCount.count > 0 && !forceReset) {
    console.log('Database already contains records. Skipping seed.');
    return;
  }

  console.log('Seeding SIH 2026 AICTE Integrated Approval Workflow synthetic database...');

  const passwordHash = bcrypt.hashSync('aicte2026', 10);
  const now = new Date();

  // Helper dates
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
  const daysAhead = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

  // 1. SEED INSTITUTIONS
  const institutions = [
    {
      id: 'INST-001',
      aicte_permanent_id: '1-9382104921',
      name: 'Pune Institute of Computer Technology (PICT)',
      type: 'Private-Self Financing',
      region: 'Western',
      state: 'Maharashtra',
      district: 'Pune',
      address: 'Survey No. 27, Near Trimurti Chowk, Dhankawadi, Pune - 411043',
      contact_email: 'principal@pict.edu.in',
      contact_phone: '+91-20-24371101',
      principal_name: 'Dr. Rajesh Deshmukh',
      establishment_year: 1983,
    },
    {
      id: 'INST-002',
      aicte_permanent_id: '1-8472910384',
      name: 'Delhi Institute of Engineering & Technology',
      type: 'Government',
      region: 'Northern',
      state: 'Delhi',
      district: 'South West Delhi',
      address: 'Sector 12, Dwarka Institutional Area, New Delhi - 110078',
      contact_email: 'director@diet.ac.in',
      contact_phone: '+91-11-28034500',
      principal_name: 'Prof. Arvind K. Sharma',
      establishment_year: 1998,
    },
    {
      id: 'INST-003',
      aicte_permanent_id: '1-7654109823',
      name: 'Bangalore Academy of Applied Technology',
      type: 'Private-Self Financing',
      region: 'Southern',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      address: 'Electronic City Phase 1, Hosur Road, Bengaluru - 560100',
      contact_email: 'head@baat.edu.in',
      contact_phone: '+91-80-28520100',
      principal_name: 'Dr. Chitra R. Murthy',
      establishment_year: 2005,
    },
    {
      id: 'INST-004',
      aicte_permanent_id: '1-6543981204',
      name: 'Kolkata College of Advanced Engineering',
      type: 'Govt-Aided',
      region: 'Eastern',
      state: 'West Bengal',
      district: 'Kolkata',
      address: 'Salt Lake Sector V, Block EP & GP, Bidhannagar, Kolkata - 700091',
      contact_email: 'principal@kcae.ac.in',
      contact_phone: '+91-33-23579001',
      principal_name: 'Dr. Subir K. Banerjee',
      establishment_year: 1992,
    },
    {
      id: 'INST-005',
      aicte_permanent_id: '1-5432098765',
      name: 'Bhopal Institute of Technology & Management',
      type: 'Private-Self Financing',
      region: 'Central',
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      address: 'Bhadbhada Road, Ratibad, Bhopal - 462044',
      contact_email: 'dean@bitm.edu.in',
      contact_phone: '+91-755-2896500',
      principal_name: 'Dr. Manoj Saxena',
      establishment_year: 2011,
    },
    {
      id: 'INST-006',
      aicte_permanent_id: '1-4321987654',
      name: 'Chennai Institute of Applied Sciences',
      type: 'Deemed University',
      region: 'Southern',
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Old Mahabalipuram Road (OMR), Navalur, Chennai - 603103',
      contact_email: 'registrar@cias.ac.in',
      contact_phone: '+91-44-27469000',
      principal_name: 'Prof. K. Venkatesan',
      establishment_year: 2001,
    },
  ];

  for (const inst of institutions) {
    run(
      `INSERT INTO institutions (id, aicte_permanent_id, name, type, region, state, district, address, contact_email, contact_phone, principal_name, establishment_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inst.id, inst.aicte_permanent_id, inst.name, inst.type, inst.region, inst.state, inst.district, inst.address, inst.contact_email, inst.contact_phone, inst.principal_name, inst.establishment_year]
    );
  }

  // 2. SEED USERS (All 6 roles)
  const users = [
    {
      id: 'USR-001',
      name: 'Dr. Ramesh Chandra',
      email: 'admin@aicte.gov.in',
      role: 'super_admin',
      region: 'Northern',
      bureau: 'Central IT & Systems',
      institution_id: null,
      phone: '+91-11-29581001',
      designation: 'Chief Technology & Systems Officer',
    },
    {
      id: 'USR-002',
      name: 'Prof. Anil Sahasrabudhe',
      email: 'management@aicte.gov.in',
      role: 'senior_management',
      region: 'Northern',
      bureau: 'Approval Bureau',
      institution_id: null,
      phone: '+91-11-29581002',
      designation: 'Member Secretary / Senior Advisor',
    },
    {
      id: 'USR-003',
      name: 'Dr. Vivek S. Kulkarni',
      email: 'ro.western@aicte.gov.in',
      role: 'regional_officer',
      region: 'Western',
      bureau: 'Western Regional Office (Mumbai)',
      institution_id: null,
      phone: '+91-22-22855412',
      designation: 'Regional Officer - Western Region',
    },
    {
      id: 'USR-004',
      name: 'Er. Meenakshi Sundaram',
      email: 'scrutiny.officer@aicte.gov.in',
      role: 'scrutiny_officer',
      region: 'Western',
      bureau: 'Approval Bureau',
      institution_id: null,
      phone: '+91-22-22855415',
      designation: 'Senior Technical Scrutiny Analyst',
    },
    {
      id: 'USR-005',
      name: 'Dr. Rajesh Deshmukh',
      email: 'principal@pict.edu.in',
      role: 'institution_admin',
      region: 'Western',
      bureau: 'PICT Pune Administration',
      institution_id: 'INST-001',
      phone: '+91-20-24371101',
      designation: 'Principal, PICT Pune',
    },
    {
      id: 'USR-006',
      name: 'Dr. S. K. Narayanan',
      email: 'evc.coordinator@aicte.gov.in',
      role: 'evc_coordinator',
      region: 'Western',
      bureau: 'EVC Logistics Cell',
      institution_id: null,
      phone: '+91-22-22855420',
      designation: 'Expert Visit Committee Logistics Head',
    },
  ];

  for (const u of users) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, region, bureau, institution_id, phone, designation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, passwordHash, u.role, u.region, u.bureau, u.institution_id, u.phone, u.designation]
    );
  }

  // 3. SEED APPLICATIONS (Across various realistic stages and SLA states)
  const applications = [
    {
      id: 'APP-101',
      application_number: 'AICTE/2026-27/WRO-84920',
      institution_id: 'INST-001',
      workflow_code: 'EXTENSION_OF_APPROVAL',
      program_discipline: 'Computer Engineering & AI',
      proposed_intake: 240,
      current_stage: 'DEFICIENCIES_COMMUNICATED',
      status: 'PENDING_ACTION',
      assigned_officer_id: 'USR-004',
      region: 'Western',
      submitted_at: daysAgo(12),
      stage_entered_at: daysAgo(3),
      deadline_at: daysAhead(11), // 14-day SLA for response
      priority_score: 55,
      risk_level: 'MEDIUM',
    },
    {
      id: 'APP-102',
      application_number: 'AICTE/2026-27/WRO-84921',
      institution_id: 'INST-001',
      workflow_code: 'INCREASE_IN_INTAKE',
      program_discipline: 'Data Science & Cybersecurity',
      proposed_intake: 120,
      current_stage: 'EVC_SCHEDULED',
      status: 'ACTIVE',
      assigned_officer_id: 'USR-004',
      region: 'Western',
      submitted_at: daysAgo(22),
      stage_entered_at: daysAgo(5),
      deadline_at: daysAhead(5),
      priority_score: 45,
      risk_level: 'MEDIUM',
    },
    {
      id: 'APP-103',
      application_number: 'AICTE/2026-27/NRO-11029',
      institution_id: 'INST-002',
      workflow_code: 'NEW_INSTITUTION',
      program_discipline: 'Electronics & VLSI Design',
      proposed_intake: 180,
      current_stage: 'DECISION_PENDING_COMMITTEE',
      status: 'ACTIVE',
      assigned_officer_id: 'USR-004',
      region: 'Northern',
      submitted_at: daysAgo(35),
      stage_entered_at: daysAgo(4),
      deadline_at: daysAhead(1),
      priority_score: 70,
      risk_level: 'HIGH',
    },
    {
      id: 'APP-104',
      application_number: 'AICTE/2026-27/SRO-55412',
      institution_id: 'INST-003',
      workflow_code: 'EXTENSION_OF_APPROVAL',
      program_discipline: 'Information Technology',
      proposed_intake: 180,
      current_stage: 'APPROVED',
      status: 'APPROVED',
      assigned_officer_id: 'USR-004',
      region: 'Southern',
      submitted_at: daysAgo(45),
      stage_entered_at: daysAgo(8),
      deadline_at: daysAgo(1),
      priority_score: 15,
      risk_level: 'LOW',
    },
    {
      id: 'APP-105',
      application_number: 'AICTE/2026-27/ERO-99381',
      institution_id: 'INST-004',
      workflow_code: 'NEW_INSTITUTION',
      program_discipline: 'Civil & Environmental Engineering',
      proposed_intake: 60,
      current_stage: 'SCRUTINY_IN_PROGRESS',
      status: 'ACTIVE',
      assigned_officer_id: 'USR-004',
      region: 'Eastern',
      submitted_at: daysAgo(18),
      stage_entered_at: daysAgo(9), // 7-day SLA breached!
      deadline_at: daysAgo(2), // Overdue by 2 days
      priority_score: 82,
      risk_level: 'CRITICAL',
    },
    {
      id: 'APP-106',
      application_number: 'AICTE/2026-27/CRO-33491',
      institution_id: 'INST-005',
      workflow_code: 'EXTENSION_OF_APPROVAL',
      program_discipline: 'Mechanical & Automation Engineering',
      proposed_intake: 120,
      current_stage: 'SUBMITTED',
      status: 'ACTIVE',
      assigned_officer_id: null, // Unassigned!
      region: 'Central',
      submitted_at: daysAgo(6),
      stage_entered_at: daysAgo(6),
      deadline_at: daysAgo(3), // Overdue by 3 days awaiting assignment
      priority_score: 75,
      risk_level: 'CRITICAL',
    },
    {
      id: 'APP-107',
      application_number: 'AICTE/2026-27/SRO-77281',
      institution_id: 'INST-006',
      workflow_code: 'INCREASE_IN_INTAKE',
      program_discipline: 'Pharmacy (Pharm.D)',
      proposed_intake: 60,
      current_stage: 'PRELIMINARY_SCRUTINY',
      status: 'ACTIVE',
      assigned_officer_id: 'USR-004',
      region: 'Southern',
      submitted_at: daysAgo(4),
      stage_entered_at: daysAgo(3),
      deadline_at: daysAhead(2),
      priority_score: 30,
      risk_level: 'LOW',
    },
  ];

  for (const app of applications) {
    run(
      `INSERT INTO applications (id, application_number, institution_id, workflow_code, academic_year, program_discipline, proposed_intake, current_stage, status, assigned_officer_id, region, submitted_at, stage_entered_at, deadline_at, priority_score, risk_level)
       VALUES (?, ?, ?, ?, '2026-2027', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [app.id, app.application_number, app.institution_id, app.workflow_code, app.program_discipline, app.proposed_intake, app.current_stage, app.status, app.assigned_officer_id, app.region, app.submitted_at, app.stage_entered_at, app.deadline_at, app.priority_score, app.risk_level]
    );

    // Initial transition record
    run(
      `INSERT INTO stage_transitions (id, application_id, from_stage, to_stage, action_taken, actor_id, actor_name, actor_role, remarks, timestamp)
       VALUES (?, ?, 'NONE', 'SUBMITTED', 'INITIAL_SUBMISSION', 'USR-005', 'Institution Admin', 'institution_admin', 'Application submitted with fee confirmation', ?)`,
      [`TR-INIT-${app.id}`, app.id, app.submitted_at]
    );

    // If advanced past submitted, add intermediate transition
    if (app.current_stage !== 'SUBMITTED') {
      run(
        `INSERT INTO stage_transitions (id, application_id, from_stage, to_stage, action_taken, actor_id, actor_name, actor_role, remarks, timestamp)
         VALUES (?, ?, 'SUBMITTED', ?, 'STAGE_PROGRESSED', 'USR-003', 'Dr. Vivek S. Kulkarni', 'regional_officer', 'Verified preliminary checklist and advanced application', ?)`,
        [`TR-ADV-${app.id}`, app.id, app.current_stage, app.stage_entered_at]
      );
    }
  }

  // 4. SEED SCRUTINY OBSERVATIONS / DEFICIENCIES
  const deficiencies = [
    {
      id: 'OBS-001',
      application_id: 'APP-101',
      officer_id: 'USR-004',
      category: 'Faculty Cadre Ratio',
      severity: 'MAJOR',
      observation_text: 'Cadre ratio of Professor:Associate Professor:Assistant Professor is 1:1:8 against prescribed 1:2:6 standard as per APH 2026-27 Table 7.4. Shortfall of 1 Associate Professor.',
      rule_reference: 'APH 2026-27 Clause 7.4 & Appendix 7',
      status: 'OPEN',
      institution_response: null,
      created_at: daysAgo(3),
    },
    {
      id: 'OBS-002',
      application_id: 'APP-101',
      officer_id: 'USR-004',
      category: 'Land & Infrastructure',
      severity: 'CRITICAL',
      observation_text: 'Registered Lease Deed for adjacent workshop plot (Survey No. 27/2) shows validity ending 31st Dec 2026. APH requires minimum 30 years unexpired lease for technical institutions.',
      rule_reference: 'APH 2026-27 Clause 4.1.2 (Land Lease Terms)',
      status: 'OPEN',
      institution_response: 'Board of Trustees has executed renewal deed on stamp paper; registration appointment scheduled with Sub-Registrar.',
      created_at: daysAgo(3),
    },
    {
      id: 'OBS-003',
      application_id: 'APP-105',
      officer_id: 'USR-004',
      category: 'Safety & Regulatory NOCs',
      severity: 'CRITICAL',
      observation_text: 'Fire Safety Certificate issued by Municipal Corporation expired on 15-Oct-2026. Renewal NOC not submitted in primary dossier.',
      rule_reference: 'National Building Code 2016 Part 4 & APH Clause 5.3',
      status: 'OPEN',
      institution_response: null,
      created_at: daysAgo(7),
    },
  ];

  for (const def of deficiencies) {
    run(
      `INSERT INTO scrutiny_observations (id, application_id, officer_id, category, severity, observation_text, rule_reference, status, institution_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [def.id, def.application_id, def.officer_id, def.category, def.severity, def.observation_text, def.rule_reference, def.status, def.institution_response, def.created_at]
    );
  }

  // 5. SEED COMPLIANCE OBLIGATIONS (Independent subsystem)
  const obligations = [
    {
      id: 'COMP-001',
      obligation_code: 'OBL-2026-1042',
      institution_id: 'INST-001',
      application_id: 'APP-101',
      title: 'Submission of 30-Year Registered Land Lease Renewal',
      description: 'Submit certified copy of registered lease deed extension for 30 years covering Survey 27/2 with Sub-Registrar seal.',
      category: 'LAND_LEASE',
      rule_reference: 'APH Clause 4.1.2',
      due_date: daysAhead(14),
      status: 'AWAITING_SUBMISSION',
      escalation_level: 0,
    },
    {
      id: 'COMP-002',
      obligation_code: 'OBL-2026-0982',
      institution_id: 'INST-001',
      application_id: 'APP-101',
      title: 'Aadhaar-Based Biometric Attendance System Integration',
      description: 'Upload API integration verification certificate from AICTE Biometric Central Server for all faculty members.',
      category: 'BIOMETRIC_ATTENDANCE',
      rule_reference: 'AICTE Gazette Notification F.No. 1-104/AICTE/GRC/2021',
      due_date: daysAhead(30),
      status: 'AWAITING_SUBMISSION',
      escalation_level: 0,
    },
    {
      id: 'COMP-003',
      obligation_code: 'OBL-2026-0511',
      institution_id: 'INST-004',
      application_id: 'APP-105',
      title: 'Fire Safety NOC Renewal Submission',
      description: 'Submit updated No Objection Certificate from West Bengal Fire & Emergency Services with site plan verification.',
      category: 'FIRE_SAFETY_NOC',
      rule_reference: 'APH Clause 5.3',
      due_date: daysAgo(5), // 5 days overdue!
      status: 'OVERDUE',
      escalation_level: 1,
    },
    {
      id: 'COMP-004',
      obligation_code: 'OBL-2026-0128',
      institution_id: 'INST-005',
      application_id: null,
      title: 'Annual Anti-Ragging Affidavit & Committee Report',
      description: 'Institutional submission of anti-ragging undertaking signed by all first-year students and parents.',
      category: 'ANTI_RAGGING',
      rule_reference: 'UGC/AICTE Ragging Prevention Regulations 2009',
      due_date: daysAgo(12), // 12 days overdue! Escalated to level 2!
      status: 'ESCALATED',
      escalation_level: 2,
    },
  ];

  for (const ob of obligations) {
    run(
      `INSERT INTO compliance_obligations (id, obligation_code, institution_id, application_id, title, description, category, rule_reference, due_date, status, escalation_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ob.id, ob.obligation_code, ob.institution_id, ob.application_id, ob.title, ob.description, ob.category, ob.rule_reference, ob.due_date, ob.status, ob.escalation_level, daysAgo(20)]
    );
  }

  // 6. SEED PRESCRIBED DOCUMENTS (With versioning & expiry tracking)
  const documents = [
    {
      id: 'DOC-101',
      institution_id: 'INST-001',
      application_id: 'APP-101',
      obligation_id: 'COMP-001',
      document_type: 'LAND_LEASE_DEED',
      document_name: 'Registered_Lease_Deed_PICT_Dhankawadi_v1.pdf',
      file_path: '/uploads/Registered_Lease_Deed_PICT_Dhankawadi_v1.pdf',
      file_size: 1420000,
      version: 1,
      issue_date: '1996-12-31',
      expiry_date: '2026-12-31', // Expiring in ~60 days!
      verification_status: 'RENEWAL_REQUIRED',
      notes: 'Initial 30-year lease registered in 1996. Approaching expiration window.',
    },
    {
      id: 'DOC-102',
      institution_id: 'INST-001',
      application_id: 'APP-101',
      obligation_id: null,
      document_type: 'BUILDING_PLAN_SANCTION',
      document_name: 'PMC_Approved_Building_Sanction_Plan.pdf',
      file_path: '/uploads/PMC_Approved_Building_Sanction_Plan.pdf',
      file_size: 2840000,
      version: 1,
      issue_date: '2018-06-15',
      expiry_date: '2038-06-14',
      verification_status: 'VERIFIED',
      notes: 'Verified against Pune Municipal Corporation Urban Development plan.',
    },
    {
      id: 'DOC-103',
      institution_id: 'INST-004',
      application_id: 'APP-105',
      obligation_id: 'COMP-003',
      document_type: 'FIRE_SAFETY_NOC',
      document_name: 'Fire_Safety_NOC_KCAE_SaltLake.pdf',
      file_path: '/uploads/Fire_Safety_NOC_KCAE_SaltLake.pdf',
      file_size: 512000,
      version: 1,
      issue_date: '2025-10-14',
      expiry_date: daysAgo(12), // Already expired 12 days ago!
      verification_status: 'EXPIRED',
      notes: 'Expired statutory document. Renewal proof urgently mandatory.',
    },
    {
      id: 'DOC-104',
      institution_id: 'INST-002',
      application_id: 'APP-103',
      obligation_id: null,
      document_type: 'AICTE_ENDOWMENT_FDR',
      document_name: 'Joint_FDR_Rs100Lakhs_SBI_Dwarka.pdf',
      file_path: '/uploads/Joint_FDR_Rs100Lakhs_SBI_Dwarka.pdf',
      file_size: 320000,
      version: 1,
      issue_date: '2024-03-01',
      expiry_date: '2032-03-01',
      verification_status: 'VERIFIED',
      notes: 'Lien marked in favor of Regional Officer, AICTE Northern Region.',
    },
  ];

  for (const doc of documents) {
    run(
      `INSERT INTO documents (id, institution_id, application_id, obligation_id, document_type, document_name, file_path, file_size, version, issue_date, expiry_date, verification_status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [doc.id, doc.institution_id, doc.application_id, doc.obligation_id, doc.document_type, doc.document_name, doc.file_path, doc.file_size, doc.version, doc.issue_date, doc.expiry_date, doc.verification_status, doc.notes]
    );
  }

  // 7. SEED EVC VISITS (Including demonstrated scheduling conflict!)
  const evcVisits = [
    {
      id: 'EVC-001',
      visit_code: 'EVC-2026-084',
      application_id: 'APP-102',
      institution_id: 'INST-001',
      committee_chair_name: 'Prof. Hemant R. Verma (IIT Bombay)',
      committee_chair_email: 'hrverma@ee.iitb.ac.in',
      committee_members_json: JSON.stringify([
        { name: 'Prof. Hemant R. Verma', role: 'Chairman', affiliation: 'IIT Bombay' },
        { name: 'Dr. Sunita Rao', role: 'Member (Computer Engg)', affiliation: 'VJTI Mumbai' },
        { name: 'Dr. K. N. Patil', role: 'Regional Officer Nominee', affiliation: 'AICTE WRO' },
      ]),
      proposed_date: daysAhead(4),
      confirmed_date: daysAhead(4),
      visit_status: 'SCHEDULED',
      conflict_details: null,
    },
    {
      id: 'EVC-002',
      visit_code: 'EVC-2026-085',
      application_id: 'APP-105',
      institution_id: 'INST-004',
      committee_chair_name: 'Prof. Hemant R. Verma (IIT Bombay)',
      committee_chair_email: 'hrverma@ee.iitb.ac.in', // CONFLICT: Same chair on overlapping dates!
      committee_members_json: JSON.stringify([
        { name: 'Prof. Hemant R. Verma', role: 'Chairman', affiliation: 'IIT Bombay' },
        { name: 'Dr. B. K. Bose', role: 'Member (Civil)', affiliation: 'Jadavpur University' },
      ]),
      proposed_date: daysAhead(4), // Same day as EVC-001 in Pune!
      confirmed_date: null,
      visit_status: 'CONFLICT_DETECTED',
      conflict_details: 'Scheduling Conflict: Chairman Prof. Hemant R. Verma is already confirmed for EVC-2026-084 at PICT Pune on this date.',
    },
  ];

  for (const ev of evcVisits) {
    run(
      `INSERT INTO evc_visits (id, visit_code, application_id, institution_id, committee_chair_name, committee_chair_email, committee_members_json, proposed_date, confirmed_date, visit_status, conflict_details, coordinator_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USR-006', datetime('now'))`,
      [ev.id, ev.visit_code, ev.application_id, ev.institution_id, ev.committee_chair_name, ev.committee_chair_email, ev.committee_members_json, ev.proposed_date, ev.confirmed_date, ev.visit_status, ev.conflict_details]
    );
  }

  // 8. SEED INTELLIGENT ALERTS & ESCALATION QUEUE
  const alerts = [
    {
      id: 'ALT-101',
      alert_code: 'ALT-948201',
      entity_type: 'APPLICATION',
      entity_id: 'APP-105',
      institution_id: 'INST-004',
      severity: 'CRITICAL',
      title: '[LEVEL 2 ESCALATION] APP-105 Scrutiny SLA Breached by 2 Days',
      message: 'Scrutiny Officer has exceeded 7-day technical verification SLA for Kolkata College of Advanced Engineering. Escalated to Regional Officer.',
      responsible_role: 'regional_officer',
      deadline_at: daysAgo(2),
      escalation_level: 2,
      risk_score: 82,
      dedup_key: 'APP_APP-105_L2_OVERDUE',
    },
    {
      id: 'ALT-102',
      alert_code: 'ALT-948202',
      entity_type: 'COMPLIANCE_OBLIGATION',
      entity_id: 'COMP-004',
      institution_id: 'INST-005',
      severity: 'CRITICAL',
      title: '[LEVEL 2 ESCALATION] Anti-Ragging Undertaking Overdue by 12 Days',
      message: 'Bhopal Institute has failed to upload mandated Anti-Ragging Compliance Affidavit. Regional Officer escalation triggered.',
      responsible_role: 'regional_officer',
      deadline_at: daysAgo(12),
      escalation_level: 2,
      risk_score: 80,
      dedup_key: 'COMP_COMP-004_L2_OVERDUE',
    },
    {
      id: 'ALT-103',
      alert_code: 'ALT-948203',
      entity_type: 'DOCUMENT',
      entity_id: 'DOC-103',
      institution_id: 'INST-004',
      severity: 'CRITICAL',
      title: '[DOCUMENT EXPIRED] Fire Safety NOC Expired',
      message: 'Mandatory statutory fire safety clearance expired on 15-Oct-2026. Non-compliance alert dispatched to institution.',
      responsible_role: 'institution_admin',
      deadline_at: daysAgo(12),
      escalation_level: 2,
      risk_score: 85,
      dedup_key: 'DOC_DOC-103_EXPIRED',
    },
    {
      id: 'ALT-104',
      alert_code: 'ALT-948204',
      entity_type: 'EVC_VISIT',
      entity_id: 'EVC-002',
      institution_id: 'INST-004',
      severity: 'CRITICAL',
      title: '[EVC SCHEDULING CONFLICT] Committee Chairman Overbooked',
      message: 'Prof. Hemant R. Verma is scheduled concurrently for two on-site inspections in Pune and Kolkata on same date.',
      responsible_role: 'evc_coordinator',
      deadline_at: daysAhead(4),
      escalation_level: 2,
      risk_score: 75,
      dedup_key: 'EVC_EVC-002_CONFLICT',
    },
    {
      id: 'ALT-105',
      alert_code: 'ALT-948205',
      entity_type: 'APPLICATION',
      entity_id: 'APP-106',
      institution_id: 'INST-005',
      severity: 'URGENT',
      title: '[UNASSIGNED BOTTLENECK] Application Awaiting Officer Assignment',
      message: 'Application AICTE/2026-27/CRO-33491 has been pending in SUBMITTED state for 6 days without an assigned scrutiny officer.',
      responsible_role: 'regional_officer',
      deadline_at: daysAgo(3),
      escalation_level: 1,
      risk_score: 75,
      dedup_key: 'APP_APP-106_UNASSIGNED',
    },
  ];

  for (const alt of alerts) {
    run(
      `INSERT INTO alerts (id, alert_code, entity_type, entity_id, institution_id, severity, title, message, responsible_role, deadline_at, escalation_level, risk_score, dedup_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [alt.id, alt.alert_code, alt.entity_type, alt.entity_id, alt.institution_id, alt.severity, alt.title, alt.message, alt.responsible_role, alt.deadline_at, alt.escalation_level, alt.risk_score, alt.dedup_key]
    );
  }

  // 9. AUDIT LOGS SEED
  run(
    `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, created_at)
     VALUES (?, 'USR-001', 'Dr. Ramesh Chandra', 'super_admin', 'SYSTEM_INITIALIZATION', 'PLATFORM', 'AICTE-CORE', ?, datetime('now'))`,
    ['AUD-INIT-001', JSON.stringify({ system: 'AICTE Workflow Automation Engine', version: '2026.1-SIH', seedScenario: 'Multi-institutional test suite loaded' })]
  );

  console.log('Database seeded successfully with 6 institutions, 6 demo user roles, 7 realistic applications, compliance undertakings, document versions, EVC conflict scenario, and active escalations.');
}
