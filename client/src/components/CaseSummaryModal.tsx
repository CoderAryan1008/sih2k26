import React from 'react';
import { X, Sparkles, AlertCircle, Clock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

interface CaseSummaryModalProps {
  summary: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CaseSummaryModal: React.FC<CaseSummaryModalProps> = ({ summary, isOpen, onClose }) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-heading">
                AI Administrative Case Briefing Dossier
              </h2>
              <p className="text-xs text-slate-400">
                Application: <span className="text-blue-400 font-semibold">{summary.applicationNumber}</span> ({summary.institution?.name})
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
          {/* Next Action Box */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                <Clock className="w-3.5 h-3.5" /> Next Required Action
              </div>
              <span className="text-[11px] text-slate-400">
                Deadline: {new Date(summary.nextAction.targetDeadline).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100">{summary.nextAction.action}</p>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Responsible Party: <span className="text-slate-200 font-medium">{summary.nextAction.responsible}</span></span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Stage Dwell Time</div>
              <div className="text-base font-bold text-slate-100 mt-1">{summary.metrics.daysInCurrentStage} days</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">SLA Status</div>
              <div className={`text-base font-bold mt-1 ${summary.metrics.isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary.metrics.isOverdue ? `${summary.metrics.daysOverdue}d Overdue` : `${summary.metrics.daysRemaining}d Left`}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Risk Score</div>
              <div className="text-base font-bold text-amber-400 mt-1">{summary.metrics.riskScore}/100</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Deficiencies</div>
              <div className="text-base font-bold text-rose-400 mt-1">{summary.scrutinySummary.openCount} Open</div>
            </div>
          </div>

          {/* Scrutiny Observations Highlights */}
          {summary.scrutinySummary.items?.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Active Deficiency Non-Compliances ({summary.scrutinySummary.items.length})
              </div>
              <div className="space-y-2">
                {summary.scrutinySummary.items.map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{item.category}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-slate-300">{item.issue}</p>
                    <div className="text-[11px] text-blue-400 font-medium">Reference: {item.rule}</div>
                    <div className="text-[11px] text-slate-400 italic">
                      Response: {item.institutionResponse}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
