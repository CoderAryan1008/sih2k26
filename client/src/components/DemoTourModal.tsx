import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { UserRole } from '../types';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (view: string) => void;
}

interface TourStep {
  stepNumber: number;
  title: string;
  recommendedRole: UserRole;
  targetView: string;
  summary: string;
  actions: string[];
  expectedResult: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    title: 'Institution Submits Application',
    recommendedRole: 'institution_admin',
    targetView: 'applications',
    summary: 'Institution Administrator creates or reviews an application (e.g. Extension of Approval for PICT Pune).',
    actions: [
      'Switch to Institution Administrator role.',
      'Go to Approval Workflows tab.',
      'Observe institution data isolation (only PICT records visible).',
    ],
    expectedResult: 'Application is created in DRAFT state and formally submitted with fee confirmation into the workflow engine.',
  },
  {
    stepNumber: 2,
    title: 'Reviewer Identifies Scrutiny Deficiency',
    recommendedRole: 'scrutiny_officer',
    targetView: 'applications',
    summary: 'Scrutiny Officer inspects technical disclosures, checks cadre ratios, and flags a non-compliance.',
    actions: [
      'Switch to Scrutiny Officer role.',
      'Open application AICTE/2026-27/WRO-84920 (PICT Pune).',
      'View existing deficiencies or record a new deficiency with APH 2026-27 rule reference.',
    ],
    expectedResult: 'Deficiency is communicated to the institution. Workflow status transitions to DEFICIENCIES_COMMUNICATED.',
  },
  {
    stepNumber: 3,
    title: 'Institution Responds with Rectification',
    recommendedRole: 'institution_admin',
    targetView: 'applications',
    summary: 'Institution receives deficiency notice and uploads explanation / supporting evidence.',
    actions: [
      'Switch back to Institution Administrator role.',
      'Open the application and view the Scrutiny Observations panel.',
      'Click "Respond to Deficiency" and enter the institutional rectification explanation.',
    ],
    expectedResult: 'Response is timestamped and recorded; application queues for Re-Scrutiny verification.',
  },
  {
    stepNumber: 4,
    title: 'Progress Workflow & Recalculate SLA',
    recommendedRole: 'scrutiny_officer',
    targetView: 'applications',
    summary: 'Officer verifies rectified response and advances stage (e.g. to EVC_RECOMMENDED).',
    actions: [
      'Switch to Scrutiny Officer or Regional Officer.',
      'Click "Advance Stage" -> "EVC Recommended".',
      'Verify that invalid transitions are blocked by backend rule validation.',
    ],
    expectedResult: 'Application advances; stage timeline updates visually; stage dwell-time and new deadline are recalculated.',
  },
  {
    stepNumber: 5,
    title: 'EVC Visit Scheduled & Conflict Detected',
    recommendedRole: 'evc_coordinator',
    targetView: 'evc',
    summary: 'EVC Coordinator views scheduled inspections and demonstrates AICTE committee conflict detection.',
    actions: [
      'Switch to EVC Visit Coordinator role.',
      'Go to EVC Visit Coordination tab.',
      'Observe visit EVC-2026-085 flagged with CONFLICT_DETECTED (Prof. H. R. Verma double-booked on same date).',
      'Demonstrate the 1-click Reschedule / Conflict Resolver.',
    ],
    expectedResult: 'System detects committee chair overlapping assignments and flags conflict alert before visit can proceed.',
  },
  {
    stepNumber: 6,
    title: 'Time-Bound Compliance Obligation Created',
    recommendedRole: 'regional_officer',
    targetView: 'compliance',
    summary: 'Regional Officer creates an institutional compliance undertaking (e.g. 30-year Land Lease Renewal).',
    actions: [
      'Switch to Regional Officer role.',
      'Go to Compliance Undertakings tab.',
      'Inspect obligations across institutions with due dates and rules.',
    ],
    expectedResult: 'Obligation exists independently of workflow stage with prescribed submission deadline.',
  },
  {
    stepNumber: 7,
    title: 'Deadline Reminder Generated',
    recommendedRole: 'institution_admin',
    targetView: 'alerts',
    summary: 'Automated monitoring engine generates advance reminders for approaching deadlines.',
    actions: [
      'Go to Escalation Queue tab.',
      'View Level 0 and Level 1 advance reminders for impending deadlines (within 2-14 days).',
    ],
    expectedResult: 'Deduplicated reminders are dispatched to the responsible entity without alert fatigue spam.',
  },
  {
    stepNumber: 8,
    title: 'Simulate Time Leap / Obligation Overdue',
    recommendedRole: 'senior_management',
    targetView: 'alerts',
    summary: 'Demonstrate automated aging when an institution fails to submit evidence by deadline.',
    actions: [
      'Click "Simulate Time Leap / Run SLA Engine" in the top bar.',
      'Observe overdue calculations for obligations past their due date.',
    ],
    expectedResult: 'Obligation status automatically shifts to OVERDUE and generates an urgent escalation.',
  },
  {
    stepNumber: 9,
    title: 'Escalation Queue Updates (Level 2 & 3)',
    recommendedRole: 'senior_management',
    targetView: 'alerts',
    summary: 'Breached deadlines trigger multi-level escalation to Regional Officer and Senior Management.',
    actions: [
      'Switch to AICTE Senior Management role.',
      'Inspect Level 2 and Level 3 Escalations in the Escalation Queue.',
      'Review the transparent Explainable Risk Score (0-100 breakdown of factors).',
    ],
    expectedResult: 'Every escalation has an explicit reason, policy trigger, overdue duration, and traceable history.',
  },
  {
    stepNumber: 10,
    title: 'Supervisor Acknowledges Escalation',
    recommendedRole: 'senior_management',
    targetView: 'alerts',
    summary: 'Senior official acknowledges the escalation with a recorded action plan.',
    actions: [
      'Click "Acknowledge Escalation" on an active alert.',
      'Input remedial instructions (e.g. "Granted 48h final notice before regulatory penalty").',
    ],
    expectedResult: 'Alert is marked acknowledged; timestamp, user identity, and notes are permanently captured in audit log.',
  },
  {
    stepNumber: 11,
    title: 'Institution Submits Compliance Evidence',
    recommendedRole: 'institution_admin',
    targetView: 'compliance',
    summary: 'Institution uploads compliance evidence. Verify it does NOT auto-fulfill!',
    actions: [
      'Switch to Institution Administrator role.',
      'Click "Submit Evidence" on an obligation (e.g. COMP-001).',
      'Select document and submit.',
    ],
    expectedResult: 'Status becomes SUBMITTED / UNDER_REVIEW. The obligation is NOT fulfilled until officer accepts it.',
  },
  {
    stepNumber: 12,
    title: 'Authorized Reviewer Accepts Evidence',
    recommendedRole: 'scrutiny_officer',
    targetView: 'compliance',
    summary: 'Authorized officer audits the evidence and accepts it, formally resolving the obligation.',
    actions: [
      'Switch to Scrutiny Officer role.',
      'Click "Review Evidence" -> "Accept & Fulfill".',
      'Enter verification notes.',
    ],
    expectedResult: 'Obligation marked FULFILLED_ACCEPTED; linked document marked VERIFIED; associated alert resolved.',
  },
  {
    stepNumber: 13,
    title: 'Dashboards & Bottleneck Analytics Update',
    recommendedRole: 'senior_management',
    targetView: 'dashboard',
    summary: 'Observe real-time recalculation of compliance fulfillment rate, active pendency, and bottleneck graphs.',
    actions: [
      'Switch to Senior Management or Super Admin.',
      'Navigate to Executive Dashboard and Bottleneck Intelligence.',
      'Observe stage dwell times, team workloads, and KPI drill-downs.',
    ],
    expectedResult: 'All KPIs and charts update dynamically from live database records without cached anomalies.',
  },
  {
    stepNumber: 14,
    title: 'Reconstruct Sequence via Tamper-Evident Audit Trail',
    recommendedRole: 'super_admin',
    targetView: 'audit',
    summary: 'Verify the complete, unalterable historical timeline of all actions taken during the test.',
    actions: [
      'Switch to Super Administrator role.',
      'Go to Audit Trail tab.',
      'Filter by actor or entity to review the complete chain of custody.',
    ],
    expectedResult: 'Every login, transition, deficiency, evidence upload, review, and acknowledgment is traceable with before/after state.',
  },
];

export const DemoTourModal: React.FC<DemoTourModalProps> = ({ isOpen, onClose, onNavigateTo }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const { switchRole } = useAuth();

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIdx];

  const handleApplyStep = async () => {
    await switchRole(currentStep.recommendedRole);
    onNavigateTo(currentStep.targetView);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-heading">
                Interactive Judge Walkthrough (14-Step Scenario)
              </h2>
              <p className="text-xs text-slate-400">
                Step-by-step master evaluation flow for Smart India Hackathon 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pill Indicator */}
        <div className="py-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Step {currentStep.stepNumber} of {TOUR_STEPS.length}</span>
            <span className="font-semibold text-blue-400">{Math.round((currentStep.stepNumber / TOUR_STEPS.length) * 100)}% Complete</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${(currentStep.stepNumber / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content Card */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Step #{currentStep.stepNumber} Scenario
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">{currentStep.title}</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-950 border border-blue-700/60 text-blue-300 flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Role: {currentStep.recommendedRole}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.summary}</p>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">Recommended Judge Actions:</div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentStep.actions.map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/50 text-xs">
            <span className="font-bold text-blue-300">Expected Outcome: </span>
            <span className="text-slate-300">{currentStep.expectedResult}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              onClick={() => setCurrentStepIdx(Math.min(TOUR_STEPS.length - 1, currentStepIdx + 1))}
              disabled={currentStepIdx === TOUR_STEPS.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-medium cursor-pointer"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleApplyStep}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <span>Jump to Step Action Now</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
