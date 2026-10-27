import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EvcVisit } from '../types';
import { 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  FileCheck, 
  Plus, 
  UserCheck, 
  Users, 
  Flame, 
  ShieldAlert 
} from 'lucide-react';

export const EvcView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [visits, setVisits] = useState<EvcVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<EvcVisit | null>(null);
  const [newVisitDate, setNewVisitDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Complete Visit Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [evcOutcome, setEvcOutcome] = useState<'RECOMMENDED_UNCONDITIONAL' | 'RECOMMENDED_WITH_DEFICIENCIES' | 'NOT_RECOMMENDED'>('RECOMMENDED_UNCONDITIONAL');
  const [reportSummary, setReportSummary] = useState('');

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await api.getEvcVisits();
      if (res.success) {
        setVisits(res.visits);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [activeRole]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    try {
      const res = await api.rescheduleEvcVisit(selectedVisit.id, newVisitDate, rescheduleReason);
      if (res.success) {
        setRescheduleModalOpen(false);
        setNewVisitDate('');
        setRescheduleReason('');
        await fetchVisits();
      } else {
        alert(res.error || 'Reschedule failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    try {
      const res = await api.completeEvcVisit(selectedVisit.id, {
        outcome: evcOutcome,
        reportSummary,
      });
      if (res.success) {
        setCompleteModalOpen(false);
        setReportSummary('');
        await fetchVisits();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-blue-400">On-Site & Hybrid Verification</div>
          <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Expert Visit Committee (EVC) Coordination</h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated conflict detection, expert panel availability, rescheduling workflows, and inspection reports.
          </p>
        </div>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {visits.map(visit => {
          const hasConflict = visit.visit_status === 'CONFLICT_DETECTED';
          return (
            <div
              key={visit.id}
              className={`p-5 rounded-2xl border transition space-y-4 ${
                hasConflict
                  ? 'bg-rose-950/20 border-rose-800/80 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400">{visit.visit_code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  hasConflict
                    ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                    : visit.visit_status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  {visit.visit_status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-white">{visit.institution_name}</h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  App: {visit.application_number} • {visit.program_discipline}
                </div>
              </div>

              {/* Conflict Banner if detected */}
              {hasConflict && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-xs text-rose-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300">Automated Conflict Alert:</div>
                    <div className="text-rose-200 mt-0.5">{visit.conflict_details}</div>
                  </div>
                </div>
              )}

              {/* Committee Panel Details */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 font-medium">Committee Chairman:</span>
                  <span className="font-bold text-white">{visit.committee_chair_name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 font-medium">Proposed Date:</span>
                  <span className="font-semibold text-slate-200">{new Date(visit.proposed_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 font-medium">Confirmed Date:</span>
                  <span className="font-semibold text-slate-200">
                    {visit.confirmed_date ? new Date(visit.confirmed_date).toLocaleDateString() : 'Awaiting Confirmation'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Expert Members:
                  </div>
                  <div className="space-y-1">
                    {visit.committee_members?.map((mem, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span>• {mem.name}</span>
                        <span className="text-slate-500">{mem.affiliation || mem.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Completed Report Highlights */}
              {visit.visit_status === 'COMPLETED' && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-1">
                  <span className="font-bold text-emerald-400">Inspection Outcome: {visit.evc_outcome}</span>
                  <p className="text-slate-300">{visit.evc_report_summary}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                {['evc_coordinator', 'regional_officer', 'super_admin'].includes(activeRole) && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedVisit(visit);
                        setRescheduleModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{hasConflict ? 'Resolve Conflict / Reschedule' : 'Reschedule'}</span>
                    </button>

                    {visit.visit_status !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          setSelectedVisit(visit);
                          setCompleteModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Submit Report</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Reschedule EVC Visit */}
      {rescheduleModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleReschedule} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Reschedule EVC Visit & Clear Conflicts</h3>
            <p className="text-xs text-slate-300">
              Visit: <span className="font-semibold text-blue-400">{selectedVisit.visit_code}</span> ({selectedVisit.institution_name})
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">New Confirmed Visit Date:</label>
              <input
                type="date"
                value={newVisitDate}
                onChange={e => setNewVisitDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Rescheduling Justification:</label>
              <textarea
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
                placeholder="e.g. Cleared schedule clash; mutually agreed with institute and committee chair..."
                rows={3}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Confirm Rescheduling
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Complete Visit */}
      {completeModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleCompleteVisit} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Upload EVC Inspection Report & Outcome</h3>
            <p className="text-xs text-slate-300">
              Visit: <span className="font-semibold text-blue-400">{selectedVisit.visit_code}</span> ({selectedVisit.institution_name})
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Committee Statutory Outcome:</label>
              <select
                value={evcOutcome}
                onChange={e => setEvcOutcome(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              >
                <option value="RECOMMENDED_UNCONDITIONAL">RECOMMENDED UNCONDITIONAL</option>
                <option value="RECOMMENDED_WITH_DEFICIENCIES">RECOMMENDED WITH DEFICIENCIES</option>
                <option value="NOT_RECOMMENDED">NOT RECOMMENDED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Executive Summary of Physical Inspection:</label>
              <textarea
                value={reportSummary}
                onChange={e => setReportSummary(e.target.value)}
                placeholder="Physical verification of laboratory equipment, computing facilities, and building stability..."
                rows={4}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Submit Inspection Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
