export type UserRole =
  | 'super_admin'
  | 'senior_management'
  | 'regional_officer'
  | 'scrutiny_officer'
  | 'institution_admin'
  | 'evc_coordinator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  region?: string;
  bureau?: string;
  institution_id?: string;
  institution_name?: string;
  aicte_permanent_id?: string;
  designation?: string;
}

export interface DemoAccount {
  role: UserRole;
  roleLabel: string;
  name: string;
  email: string;
  designation: string;
  region: string;
  bureau: string;
  description: string;
}

export interface Application {
  id: string;
  application_number: string;
  institution_id: string;
  institution_name: string;
  aicte_permanent_id: string;
  workflow_code: string;
  academic_year: string;
  program_discipline: string;
  proposed_intake: number;
  current_stage: string;
  stageName?: string;
  status: 'ACTIVE' | 'PENDING_ACTION' | 'ON_HOLD' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  assigned_officer_id?: string;
  officer_name?: string;
  region: string;
  state?: string;
  district?: string;
  submitted_at: string;
  stage_entered_at: string;
  deadline_at: string;
  priority_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  daysRemaining?: number;
  isOverdue?: boolean;
}

export interface StageTransition {
  id: string;
  application_id: string;
  from_stage: string;
  to_stage: string;
  action_taken: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  remarks?: string;
  prerequisites_verified?: string;
  timestamp: string;
}

export interface ScrutinyObservation {
  id: string;
  application_id: string;
  officer_id: string;
  officer_name?: string;
  category: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  observation_text: string;
  rule_reference: string;
  status: 'OPEN' | 'RESOLVED' | 'WAIVED';
  institution_response?: string;
  institution_response_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ComplianceObligation {
  id: string;
  obligation_code: string;
  institution_id: string;
  institution_name?: string;
  application_id?: string;
  title: string;
  description: string;
  category: string;
  rule_reference: string;
  due_date: string;
  status: 'CREATED' | 'AWAITING_SUBMISSION' | 'SUBMITTED' | 'UNDER_REVIEW' | 'DEFICIENT_RETURNED' | 'FULFILLED_ACCEPTED' | 'OVERDUE' | 'ESCALATED' | 'CLOSED';
  evidence_document_id?: string;
  evidence_doc_name?: string;
  submission_notes?: string;
  submitted_at?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  escalation_level: number;
  daysRemaining?: number;
  isOverdue?: boolean;
}

export interface DocumentItem {
  id: string;
  institution_id: string;
  institution_name?: string;
  application_id?: string;
  obligation_id?: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  version: number;
  issue_date?: string;
  expiry_date?: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'RENEWAL_REQUIRED';
  replacement_of_doc_id?: string;
  notes?: string;
  daysUntilExpiry?: number | null;
  isExpired?: boolean;
  created_at: string;
}

export interface EvcVisit {
  id: string;
  visit_code: string;
  application_id: string;
  application_number: string;
  institution_id: string;
  institution_name: string;
  program_discipline: string;
  region: string;
  committee_chair_name: string;
  committee_chair_email: string;
  committee_members: Array<{ name: string; role: string; affiliation?: string }>;
  proposed_date: string;
  confirmed_date?: string;
  visit_status: 'PENDING_SCHEDULING' | 'SCHEDULED' | 'RESCHEDULE_REQUESTED' | 'CONFLICT_DETECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reschedule_reason?: string;
  conflict_details?: string;
  evc_report_summary?: string;
  evc_outcome?: 'RECOMMENDED_UNCONDITIONAL' | 'RECOMMENDED_WITH_DEFICIENCIES' | 'NOT_RECOMMENDED';
}

export interface AlertItem {
  id: string;
  alert_code: string;
  entity_type: 'APPLICATION' | 'COMPLIANCE_OBLIGATION' | 'DOCUMENT' | 'EVC_VISIT';
  entity_id: string;
  institution_id: string;
  institution_name?: string;
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  title: string;
  message: string;
  responsible_role: string;
  deadline_at?: string;
  escalation_level: number;
  risk_score: number;
  is_acknowledged: number;
  acknowledged_by?: string;
  ack_user_name?: string;
  acknowledged_at?: string;
  acknowledgement_notes?: string;
  is_resolved: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: any;
  ip_address: string;
  created_at: string;
}
