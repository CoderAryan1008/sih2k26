import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'aicte_workflow.db');

export const db = new Database(DB_PATH, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});

// Enable WAL mode for high concurrency & enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- USERS & ROLES TABLE
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin', 'evc_coordinator')),
      region TEXT DEFAULT 'Northern',
      bureau TEXT DEFAULT 'Approval Bureau',
      institution_id TEXT,
      phone TEXT,
      designation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
    );

    -- INSTITUTIONS TABLE
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      aicte_permanent_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'Government', 'Private-Self Financing', 'Deemed University', 'Govt-Aided'
      region TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      principal_name TEXT NOT NULL,
      establishment_year INTEGER NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- WORKFLOW TEMPLATES & STAGES TABLE
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL, -- 'NEW_INSTITUTION', 'EXTENSION_OF_APPROVAL', 'INCREASE_IN_INTAKE', 'CLOSURE_OR_MERGER'
      title TEXT NOT NULL,
      description TEXT,
      version INTEGER DEFAULT 1,
      stages_json TEXT NOT NULL, -- JSON array of stage definitions, mandatory checklists, permitted next stages
      sla_days_json TEXT NOT NULL, -- JSON mapping stage -> sla_days
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- APPLICATIONS TABLE
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      application_number TEXT UNIQUE NOT NULL,
      institution_id TEXT NOT NULL,
      workflow_code TEXT NOT NULL,
      academic_year TEXT NOT NULL DEFAULT '2026-2027',
      program_discipline TEXT NOT NULL, -- 'Engineering & Technology', 'Management', 'Pharmacy', 'Applied Arts & Crafts'
      proposed_intake INTEGER DEFAULT 180,
      current_stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING_ACTION', 'ON_HOLD', 'APPROVED', 'REJECTED', 'WITHDRAWN'
      assigned_officer_id TEXT,
      region TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deadline_at DATETIME NOT NULL,
      priority_score INTEGER DEFAULT 25,
      risk_level TEXT DEFAULT 'LOW' CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      clock_stopped INTEGER DEFAULT 0,
      clock_stopped_reason TEXT,
      total_days_elapsed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_officer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- STAGE TRANSITIONS & AUDIT HISTORY
    CREATE TABLE IF NOT EXISTS stage_transitions (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      from_stage TEXT NOT NULL,
      to_stage TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      remarks TEXT,
      prerequisites_verified TEXT, -- JSON checklist
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- SCRUTINY OBSERVATIONS / DEFICIENCIES TABLE
    CREATE TABLE IF NOT EXISTS scrutiny_observations (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      officer_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Land & Infrastructure', 'Faculty Cadre Ratio', 'Financial Soundness', 'Safety & Regulatory NOCs', 'Labs & Equipment'
      severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
      observation_text TEXT NOT NULL,
      rule_reference TEXT NOT NULL, -- e.g. 'APH 2026-27 Clause 4.2'
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'RESOLVED', 'WAIVED')),
      institution_response TEXT,
      institution_response_at DATETIME,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- INSTITUTIONAL COMPLIANCE OBLIGATIONS TABLE
    CREATE TABLE IF NOT EXISTS compliance_obligations (
      id TEXT PRIMARY KEY,
      obligation_code TEXT UNIQUE NOT NULL,
      institution_id TEXT NOT NULL,
      application_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL, -- 'LAND_LEASE', 'FACULTY_RECRUITMENT', 'BIOMETRIC_ATTENDANCE', 'ANTI_RAGGING', 'FIRE_SAFETY_NOC', 'BUILDING_STABILITY', 'ENDOWMENT_FUND'
      rule_reference TEXT NOT NULL,
      due_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'AWAITING_SUBMISSION' CHECK(status IN ('CREATED', 'AWAITING_SUBMISSION', 'SUBMITTED', 'UNDER_REVIEW', 'DEFICIENT_RETURNED', 'FULFILLED_ACCEPTED', 'OVERDUE', 'ESCALATED', 'CLOSED')),
      evidence_document_id TEXT,
      submission_notes TEXT,
      submitted_at DATETIME,
      reviewer_id TEXT,
      reviewer_notes TEXT,
      reviewed_at DATETIME,
      escalation_level INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- DOCUMENTS REGISTRY TABLE
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      application_id TEXT,
      obligation_id TEXT,
      document_type TEXT NOT NULL, -- 'LAND_LEASE_DEED', 'BUILDING_PLAN_SANCTION', 'FIRE_SAFETY_NOC', 'POLLUTION_CONTROL_NOC', 'AICTE_ENDOWMENT_FDR', 'AFFILIATING_UNIVERSITY_NOC', 'SOCIETY_REGISTRATION', 'EVC_INSPECTION_REPORT'
      document_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 102400,
      mime_type TEXT DEFAULT 'application/pdf',
      version INTEGER DEFAULT 1,
      issue_date DATE,
      expiry_date DATE,
      verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'RENEWAL_REQUIRED')),
      replacement_of_doc_id TEXT,
      verified_by_officer_id TEXT,
      verified_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
      FOREIGN KEY (replacement_of_doc_id) REFERENCES documents(id) ON DELETE SET NULL,
      FOREIGN KEY (verified_by_officer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- EVC VISITS & COMMITTEE SCHEDULING TABLE
    CREATE TABLE IF NOT EXISTS evc_visits (
      id TEXT PRIMARY KEY,
      visit_code TEXT UNIQUE NOT NULL,
      application_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      committee_chair_name TEXT NOT NULL,
      committee_chair_email TEXT NOT NULL,
      committee_members_json TEXT NOT NULL, -- JSON array of expert members
      proposed_date DATE NOT NULL,
      confirmed_date DATE,
      visit_status TEXT NOT NULL DEFAULT 'PENDING_SCHEDULING' CHECK(visit_status IN ('PENDING_SCHEDULING', 'SCHEDULED', 'RESCHEDULE_REQUESTED', 'CONFLICT_DETECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      reschedule_reason TEXT,
      conflict_details TEXT,
      evc_report_summary TEXT,
      evc_outcome TEXT CHECK(evc_outcome IN ('RECOMMENDED_UNCONDITIONAL', 'RECOMMENDED_WITH_DEFICIENCIES', 'NOT_RECOMMENDED')),
      report_document_id TEXT,
      coordinator_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- INTELLIGENT ALERTS & ESCALATIONS TABLE
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      alert_code TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('APPLICATION', 'COMPLIANCE_OBLIGATION', 'DOCUMENT', 'EVC_VISIT')),
      entity_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'URGENT', 'CRITICAL')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      responsible_role TEXT NOT NULL,
      responsible_user_id TEXT,
      deadline_at DATETIME,
      escalation_level INTEGER DEFAULT 0, -- 0: Reminder, 1: Officer Alert, 2: Regional Escalation, 3: Senior Management Escalation
      risk_score INTEGER DEFAULT 30,
      is_acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at DATETIME,
      acknowledgement_notes TEXT,
      is_resolved INTEGER DEFAULT 0,
      resolved_at DATETIME,
      resolution_action TEXT,
      dedup_key TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- AUDIT LOGS TABLE
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SYSTEM SETTINGS & INTEGRATIONS TABLE
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- INDEXES FOR FAST QUERYING & SLA ANALYTICS
    CREATE INDEX IF NOT EXISTS idx_apps_institution ON applications(institution_id);
    CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(current_stage);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_apps_officer ON applications(assigned_officer_id);
    CREATE INDEX IF NOT EXISTS idx_apps_region ON applications(region);
    CREATE INDEX IF NOT EXISTS idx_apps_deadline ON applications(deadline_at);
    CREATE INDEX IF NOT EXISTS idx_obs_app ON scrutiny_observations(application_id);
    CREATE INDEX IF NOT EXISTS idx_comp_institution ON compliance_obligations(institution_id);
    CREATE INDEX IF NOT EXISTS idx_comp_status ON compliance_obligations(status);
    CREATE INDEX IF NOT EXISTS idx_comp_due ON compliance_obligations(due_date);
    CREATE INDEX IF NOT EXISTS idx_docs_institution ON documents(institution_id);
    CREATE INDEX IF NOT EXISTS idx_docs_expiry ON documents(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_alerts_institution ON alerts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(is_resolved, is_acknowledged);
    CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(escalation_level);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}

// Database query helpers
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

export function run(sql: string, params: any[] = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
