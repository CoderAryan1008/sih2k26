import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ComplianceObligation } from '../types';
import { 
  ClipboardCheck, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  FileText, 
  Filter, 
  UserCheck, 
  Info,
  X
} from 'lucide-react';

export const ComplianceView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedOb, setSelectedOb] = useState<ComplianceObligation | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'ACCEPT' | 'RETURN_DEFICIENT'>('ACCEPT');
  const [reviewerNotes, setReviewerNotes] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('LAND_LEASE');
  const [newRule, setNewRule] = useState('APH Clause 4.1.2');
  const [newDueDate, setNewDueDate] = useState('');
  const [newInstId, setNewInstId] = useState('INST-001');

  const fetchObligations = async () => {
    setLoading(true);
    try {
      const res = await api.getComplianceObligations({
        category: filterCategory || undefined,
        status: filterStatus || undefined,
      });
      if (res.success) {
        setObligations(res.obligations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObligations();
  }, [filterCategory, filterStatus, activeRole]);

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOb) return;
    try {
      const res = await api.submitComplianceEvidence(selectedOb.id, {
        evidenceDocumentId: 'DOC-101',
        submissionNotes,
      });
      if (res.success) {
        setSubmitModalOpen(false);
        setSubmissionNotes('');
        await fetchObligations();
      } else {
        alert(res.error || 'Submission failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOb) return;
    try {
      const res = await api.reviewComplianceEvidence(selectedOb.id, {
        decision: reviewDecision,
        reviewerNotes,
      });
      if (res.success) {
        setReviewModalOpen(false);
        setReviewerNotes('');
        await fetchObligations();
      } else {
        alert(res.error || 'Review failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULFILLED_ACCEPTED':
      case 'CLOSED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'DEFICIENT_RETURNED':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'OVERDUE':
        return 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
      case 'ESCALATED':
        return 'bg-purple-950 text-purple-300 border-purple-800 font-extrabold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-blue-400">Continuous Regulatory Compliance</div>
          <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Institutional Compliance Undertakings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Independent compliance subsystem tracking land lease deeds, faculty cadre ratios, and statutory affidavits.
          </p>
        </div>

        {['regional_officer', 'senior_management', 'super_admin'].includes(activeRole) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Obligation</span>
          </button>
        )}
      </div>

      {/* Principle Reminder Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-900/40 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">AICTE Regulatory Principle: </span>
          Uploading a document does <span className="text-amber-400 font-semibold">NOT</span> automatically mark an obligation as fulfilled. An authorized AICTE reviewer must formally verify the evidence and record an outcome.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-300">Filters:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="LAND_LEASE">Land Lease Deed</option>
            <option value="FACULTY_RECRUITMENT">Faculty Cadre Ratio</option>
            <option value="BIOMETRIC_ATTENDANCE">Biometric Attendance</option>
            <option value="ANTI_RAGGING">Anti-Ragging Undertaking</option>
            <option value="FIRE_SAFETY_NOC">Fire Safety NOC</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="AWAITING_SUBMISSION">Awaiting Submission</option>
            <option value="SUBMITTED">Submitted / Under Review</option>
            <option value="FULFILLED_ACCEPTED">Fulfilled & Accepted</option>
            <option value="DEFICIENT_RETURNED">Returned for Correction</option>
            <option value="OVERDUE">Overdue</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{obligations.length}</span> compliance undertaking(s)
        </div>
      </div>

      {/* Obligations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {obligations.map(ob => (
          <div
            key={ob.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400">{ob.obligation_code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ob.status)}`}>
                  {ob.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white line-clamp-1">{ob.title}</h3>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">{ob.institution_name}</div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">{ob.description}</p>
              <div className="text-[11px] text-indigo-400 font-semibold">Statutory Ref: {ob.rule_reference}</div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Prescribed Due Date:</span>
                <span className={`font-semibold ${ob.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                  {new Date(ob.due_date).toLocaleDateString()} {ob.isOverdue && '(OVERDUE)'}
                </span>
              </div>

              {ob.submission_notes && (
                <div className="text-[11px] text-slate-400 italic bg-slate-800/30 p-2 rounded-lg">
                  Submission note: "{ob.submission_notes}"
                </div>
              )}

              {ob.reviewer_notes && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 p-2 rounded-lg">
                  Officer notes: "{ob.reviewer_notes}"
                </div>
              )}
            </div>

            {/* Action Buttons based on Role & State */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              {/* Institution Admin Action: Upload Evidence */}
              {activeRole === 'institution_admin' && !['FULFILLED_ACCEPTED', 'CLOSED'].includes(ob.status) && (
                <button
                  onClick={() => {
                    setSelectedOb(ob);
                    setSubmitModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Submit Evidence</span>
                </button>
              )}

              {/* Officer Action: Review & Accept/Return */}
              {['scrutiny_officer', 'regional_officer', 'super_admin'].includes(activeRole) && (
                <button
                  onClick={() => {
                    setSelectedOb(ob);
                    setReviewModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-semibold text-xs cursor-pointer transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Review Evidence</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Submit Evidence */}
      {submitModalOpen && selectedOb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSubmitEvidence} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Upload Compliance Undertaking Evidence</h3>
            <p className="text-xs text-slate-300">
              Obligation: <span className="font-semibold text-blue-400">{selectedOb.title}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Submission & Certification Notes:</label>
              <textarea
                value={submissionNotes}
                onChange={e => setSubmissionNotes(e.target.value)}
                placeholder="Details of certified documents and legal compliance undertakings..."
                rows={4}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs text-amber-300">
              Note: Uploading evidence queues the obligation for officer audit. It is NOT marked fulfilled until accepted.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Submit for Audit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Review Evidence */}
      {reviewModalOpen && selectedOb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleReviewEvidence} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Authorized Officer Compliance Review</h3>
            <p className="text-xs text-slate-300">
              Obligation: <span className="font-semibold text-blue-400">{selectedOb.title}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Audit Determination:</label>
              <select
                value={reviewDecision}
                onChange={e => setReviewDecision(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              >
                <option value="ACCEPT">ACCEPT & FULFILL (Compliant)</option>
                <option value="RETURN_DEFICIENT">RETURN FOR CORRECTION (Deficiencies Noted)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Verification Remarks & Observations:</label>
              <textarea
                value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                placeholder="State verified registration numbers, tenure, or specific discrepancies..."
                rows={3}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Record Audit Outcome
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
