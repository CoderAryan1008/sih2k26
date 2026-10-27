import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Application, ScrutinyObservation, StageTransition } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink, 
  History, 
  UserCheck, 
  ChevronRight, 
  X,
  Send,
  AlertCircle
} from 'lucide-react';
import { CaseSummaryModal } from '../components/CaseSummaryModal';

interface ApplicationsViewProps {
  selectedAppId?: string;
  onClearSelectedApp?: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({ selectedAppId, onClearSelectedApp }) => {
  const { user, activeRole } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState('Computer Engineering & AI');
  const [newIntake, setNewIntake] = useState(120);

  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetTransition, setTargetTransition] = useState<any | null>(null);
  const [transitionRemarks, setTransitionRemarks] = useState('');

  const [deficiencyModalOpen, setDeficiencyModalOpen] = useState(false);
  const [defCategory, setDefCategory] = useState('Faculty Cadre Ratio');
  const [defSeverity, setDefSeverity] = useState<'CRITICAL' | 'MAJOR' | 'MINOR'>('MAJOR');
  const [defObservation, setDefObservation] = useState('');
  const [defRule, setDefRule] = useState('APH 2026-27 Clause 7.4');

  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [activeObsId, setActiveObsId] = useState<string | null>(null);
  const [institutionResponseText, setInstitutionResponseText] = useState('');

  // AI Dossier Summary Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [caseSummaryData, setCaseSummaryData] = useState<any | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.getApplications({
        stage: filterStage || undefined,
        status: filterStatus || undefined,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setApplications(res.applications);
      }
    } catch (e) {
      console.error('Failed to fetch applications:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppDetail = async (id: string) => {
    try {
      const res = await api.getApplicationDetail(id);
      if (res.success) {
        setSelectedApp(res);
      }
    } catch (e) {
      console.error('Failed to load application detail:', e);
    }
  };

  useEffect(() => {
    fetchApplications();
    if (selectedAppId) {
      fetchAppDetail(selectedAppId);
    }
  }, [filterStage, filterStatus, activeRole, selectedAppId]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createApplication({
        programDiscipline: newProgram,
        proposedIntake: Number(newIntake),
        applicationType: 'EXTENSION_OF_APPROVAL',
      });
      if (res.success) {
        setCreateModalOpen(false);
        await fetchApplications();
        if (res.applicationId) {
          fetchAppDetail(res.applicationId);
        }
      }
    } catch (err) {
      console.error('Application creation error:', err);
    }
  };

  const handleExecuteTransition = async () => {
    if (!targetTransition || !selectedApp) return;
    try {
      const res = await api.transitionApplication(selectedApp.application.id, {
        targetStage: targetTransition.targetStage,
        actionTaken: targetTransition.targetName,
        remarks: transitionRemarks,
      });
      if (res.success) {
        setTransitionModalOpen(false);
        setTransitionRemarks('');
        await fetchAppDetail(selectedApp.application.id);
        await fetchApplications();
      } else {
        alert(res.error || 'Transition failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Workflow transition failed.');
    }
  };

  const handleAddDeficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const res = await api.addObservation(selectedApp.application.id, {
        category: defCategory,
        severity: defSeverity,
        observationText: defObservation,
        ruleReference: defRule,
      });
      if (res.success) {
        setDeficiencyModalOpen(false);
        setDefObservation('');
        await fetchAppDetail(selectedApp.application.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRespondDeficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !activeObsId) return;
    try {
      const res = await api.respondObservation(selectedApp.application.id, activeObsId, institutionResponseText);
      if (res.success) {
        setResponseModalOpen(false);
        setInstitutionResponseText('');
        await fetchAppDetail(selectedApp.application.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveDeficiency = async (obsId: string) => {
    if (!selectedApp) return;
    if (confirm('Mark this scrutiny deficiency as RESOLVED?')) {
      const res = await api.resolveObservation(selectedApp.application.id, obsId);
      if (res.success) {
        await fetchAppDetail(selectedApp.application.id);
      }
    }
  };

  const handleOpenSummary = async () => {
    if (!selectedApp) return;
    try {
      const res = await api.getApplicationSummary(selectedApp.application.id);
      if (res.success) {
        setCaseSummaryData(res.summary);
        setSummaryModalOpen(true);
      }
    } catch (e) {
      console.error('Error fetching summary:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail View Mode */}
      {selectedApp ? (
        <div className="space-y-6 animate-fade-in">
          {/* Back button & Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedApp(null);
                  if (onClearSelectedApp) onClearSelectedApp();
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs flex items-center gap-1.5"
              >
                <span>← Back to Applications</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white font-heading">
                    {selectedApp.application.application_number}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    {selectedApp.application.stageName}
                  </span>
                  {selectedApp.application.isOverdue && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedApp.application.institution_name} • {selectedApp.application.program_discipline} • Intake: {selectedApp.application.proposed_intake}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold cursor-pointer transition shadow-md"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Case Dossier Brief</span>
              </button>
            </div>
          </div>

          {/* Workflow Interactive Stage Timeline */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Configured Approval Lifecycle Progress</h3>
              </div>
              <span className="text-xs text-slate-400">
                Deadline: <span className="font-semibold text-slate-200">{new Date(selectedApp.application.deadline_at).toLocaleDateString()}</span> ({selectedApp.application.daysRemaining} days remaining)
              </span>
            </div>

            {/* Stepper horizontal line */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 pt-2">
              {[
                { stage: 'DRAFT', label: '1. Draft' },
                { stage: 'SUBMITTED', label: '2. Submitted' },
                { stage: 'PRELIMINARY_SCRUTINY', label: '3. Prelim Scrutiny' },
                { stage: 'SCRUTINY_IN_PROGRESS', label: '4. Tech Scrutiny' },
                { stage: 'DEFICIENCIES_COMMUNICATED', label: '5. Deficiencies' },
                { stage: 'RE_SCRUTINY_PENDING', label: '6. Re-Scrutiny' },
                { stage: 'EVC_SCHEDULED', label: '7. EVC Visit' },
                { stage: 'DECISION_PENDING_COMMITTEE', label: '8. Committee' },
                { stage: 'APPROVED', label: '9. Approved' },
              ].map((step, idx) => {
                const isCurrent = selectedApp.application.current_stage === step.stage;
                const wasPassed = selectedApp.history?.some((h: any) => h.to_stage === step.stage);
                return (
                  <div
                    key={step.stage}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isCurrent
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-md ring-1 ring-blue-500/50'
                        : wasPassed
                        ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
                        : 'bg-slate-800/20 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{step.label}</div>
                    <div className="text-[10px] mt-1">
                      {isCurrent ? (
                        <span className="text-blue-400 font-bold">CURRENT</span>
                      ) : wasPassed ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span>Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permitted Action Bar (Workflow Engine Authorized Transitions) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Workflow Engine Action Bar
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Role-authorized state transitions for <span className="text-white font-semibold">{user?.role}</span>:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedApp.permittedActions?.map((action: any) => (
                <button
                  key={action.targetStage}
                  disabled={!action.isAuthorized}
                  onClick={() => {
                    setTargetTransition(action);
                    setTransitionModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    action.isAuthorized
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                  title={action.isAuthorized ? action.description : 'Unauthorized for your current role'}
                >
                  <span>Advance: {action.targetName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ))}

              {['scrutiny_officer', 'regional_officer', 'super_admin'].includes(activeRole) && (
                <button
                  onClick={() => setDeficiencyModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Flag Deficiency</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs / Panels for Deficiencies, Documents, and History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scrutiny Deficiencies Panel */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Scrutiny Deficiencies ({selectedApp.observations?.length || 0})
                  </h3>
                </div>
              </div>

              {selectedApp.observations?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-800/20 rounded-xl">
                  No technical non-compliances flagged for this application.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedApp.observations?.map((obs: ScrutinyObservation) => (
                    <div key={obs.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{obs.category}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            obs.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {obs.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            obs.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {obs.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300">{obs.observation_text}</p>
                      <div className="text-[11px] text-blue-400 font-medium">Ref: {obs.rule_reference}</div>

                      {/* Institution Response */}
                      {obs.institution_response ? (
                        <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs space-y-1">
                          <span className="font-semibold text-emerald-400">Institutional Response:</span>
                          <p className="text-slate-300">{obs.institution_response}</p>
                        </div>
                      ) : (
                        activeRole === 'institution_admin' && (
                          <button
                            onClick={() => {
                              setActiveObsId(obs.id);
                              setResponseModalOpen(true);
                            }}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Respond with Documentary Proof →</span>
                          </button>
                        )
                      )}

                      {/* Officer Resolve Button */}
                      {obs.status === 'OPEN' && ['scrutiny_officer', 'regional_officer', 'super_admin'].includes(activeRole) && (
                        <button
                          onClick={() => handleResolveDeficiency(obs.id)}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Deficiency Resolved</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage Transition Audit History */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Tamper-Evident Transition Log</h3>
              </div>

              <div className="space-y-3">
                {selectedApp.history?.map((tr: StageTransition, i: number) => (
                  <div key={tr.id} className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-blue-400">{tr.from_stage} → {tr.to_stage}</span>
                      <span>{new Date(tr.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-200 font-medium">{tr.action_taken}</div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tr.actor_name} ({tr.actor_role})</span>
                    </div>
                    {tr.remarks && <p className="text-slate-300 italic text-[11px] pt-1">"{tr.remarks}"</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Applications Directory View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-blue-400">Applications Registry</div>
              <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Approval Workflows</h2>
              <p className="text-xs text-slate-400 mt-1">
                Unified tracking across application registration, preliminary scrutiny, EVC, SAC, and approvals.
              </p>
            </div>

            {['institution_admin', 'super_admin'].includes(activeRole) && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>New Application</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Application No, Institute, or Discipline..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
              >
                <option value="">All Stages</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="SCRUTINY_IN_PROGRESS">Scrutiny In Progress</option>
                <option value="DEFICIENCIES_COMMUNICATED">Deficiencies Communicated</option>
                <option value="EVC_SCHEDULED">EVC Scheduled</option>
                <option value="DECISION_PENDING_COMMITTEE">Decision Pending</option>
                <option value="APPROVED">Approved</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_ACTION">Pending Action</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Application Number</th>
                    <th className="px-4 py-3.5">Institution & Discipline</th>
                    <th className="px-4 py-3.5">Current Stage</th>
                    <th className="px-4 py-3.5">Deadline & SLA</th>
                    <th className="px-4 py-3.5">Risk Score</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        No applications found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    applications.map(app => (
                      <tr
                        key={app.id}
                        onClick={() => fetchAppDetail(app.id)}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="px-4 py-3.5 font-bold text-blue-400">
                          {app.application_number}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-200">{app.institution_name}</div>
                          <div className="text-[11px] text-slate-400">{app.program_discipline} • Intake: {app.proposed_intake}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                            {app.stageName || app.current_stage}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-slate-300">{new Date(app.deadline_at).toLocaleDateString()}</div>
                          <div className={`text-[11px] font-semibold ${app.isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {app.isOverdue ? `${Math.abs(app.daysRemaining || 0)}d Overdue` : `${app.daysRemaining}d Left`}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <span>{app.priority_score}/100</span>
                            {app.risk_level === 'CRITICAL' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                CRITICAL
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button className="text-blue-400 hover:text-blue-300 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer">
                            <span>Open Dossier</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Transition Confirmation */}
      {transitionModalOpen && targetTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Confirm Workflow Stage Transition</h3>
            <p className="text-xs text-slate-300">
              Advance application to: <span className="font-bold text-blue-400">{targetTransition.targetName}</span>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Mandatory Verification Checklist:</label>
              <div className="space-y-1.5 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                {targetTransition.checklist?.map((chk: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{chk}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Officer / Action Remarks:</label>
              <textarea
                value={transitionRemarks}
                onChange={e => setTransitionRemarks(e.target.value)}
                placeholder="Enter regulatory verification remarks..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTransitionModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransition}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Flag Deficiency */}
      {deficiencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAddDeficiency} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Record Scrutiny Deficiency</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Category:</label>
              <select
                value={defCategory}
                onChange={e => setDefCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              >
                <option value="Land & Infrastructure">Land & Infrastructure</option>
                <option value="Faculty Cadre Ratio">Faculty Cadre Ratio</option>
                <option value="Safety & Regulatory NOCs">Safety & Regulatory NOCs</option>
                <option value="Financial Soundness">Financial Soundness</option>
                <option value="Labs & Equipment">Labs & Equipment</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Severity:</label>
              <select
                value={defSeverity}
                onChange={e => setDefSeverity(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              >
                <option value="CRITICAL">CRITICAL (Blocks Approval)</option>
                <option value="MAJOR">MAJOR</option>
                <option value="MINOR">MINOR</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Observation Findings:</label>
              <textarea
                value={defObservation}
                onChange={e => setDefObservation(e.target.value)}
                placeholder="Describe specific non-compliance details..."
                rows={3}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">AICTE Rule / APH Reference:</label>
              <input
                type="text"
                value={defRule}
                onChange={e => setDefRule(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeficiencyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Communicate Deficiency
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Respond to Deficiency (Institution) */}
      {responseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleRespondDeficiency} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Institutional Deficiency Response</h3>
            <p className="text-xs text-slate-300">
              Submit your documentary explanation and uploaded proof reference.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Explanation & Rectification Details:</label>
              <textarea
                value={institutionResponseText}
                onChange={e => setInstitutionResponseText(e.target.value)}
                placeholder="e.g. Executed registered deed renewal with Sub-Registrar seal attached..."
                rows={4}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResponseModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Submit Rectification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Create New Application */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleCreateApplication} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Initiate New Approval Application</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Program / Discipline:</label>
              <input
                type="text"
                value={newProgram}
                onChange={e => setNewProgram(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Proposed Student Intake:</label>
              <input
                type="number"
                value={newIntake}
                onChange={e => setNewIntake(Number(e.target.value))}
                min={30}
                max={480}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/60 text-xs text-slate-300">
              Application will be initialized in <span className="font-bold text-blue-400">DRAFT</span> stage under Academic Year 2026-2027.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Create Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Case Dossier Brief Modal */}
      <CaseSummaryModal
        summary={caseSummaryData}
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
      />
    </div>
  );
};
