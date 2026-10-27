import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { History, ShieldCheck, Search, Filter, ChevronRight, X } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: filterAction || undefined,
        limit: 100,
      });
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, activeRole]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase font-bold tracking-wider text-purple-400">Tamper-Evident Security Assurance</div>
        <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Immutable System Audit Trail</h2>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically recorded historical trail of every workflow progression, compliance decision, document renewal, and escalation acknowledgement.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-300">Filter Action:</span>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="">All Audited Actions</option>
            <option value="WORKFLOW_STAGE_TRANSITION">Workflow Transitions</option>
            <option value="SCRUTINY_DEFICIENCY_RECORDED">Deficiencies Communicated</option>
            <option value="COMPLIANCE_EVIDENCE_SUBMITTED">Compliance Evidence Submitted</option>
            <option value="COMPLIANCE_ACCEPTED">Compliance Accepted</option>
            <option value="ALERT_ACKNOWLEDGED">Escalation Acknowledged</option>
            <option value="SCHEDULE_EVC_VISIT">EVC Scheduled</option>
            <option value="DOCUMENT_REPLACED_VERSIONED">Document Versioning</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{logs.length}</span> immutable log records
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Actor Identity</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Action Executed</th>
                <th className="px-4 py-3.5">Entity Reference</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                    {log.actor_name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.actor_role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-blue-400">
                    {log.action}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    <span className="text-slate-400 text-[11px]">{log.entity_type}:</span> {log.entity_id}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 font-semibold text-[11px] cursor-pointer"
                    >
                      Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Log JSON Diff Inspection */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Audit Payload Inspector ({selectedLog.id})</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div><span className="text-slate-400">Action:</span> <span className="font-bold text-blue-400">{selectedLog.action}</span></div>
              <div><span className="text-slate-400">Actor:</span> <span className="font-semibold text-white">{selectedLog.actor_name} ({selectedLog.actor_role})</span></div>
              <div><span className="text-slate-400">Entity:</span> {selectedLog.entity_type} • {selectedLog.entity_id}</div>
              <div><span className="text-slate-400">Time:</span> {new Date(selectedLog.created_at).toISOString()}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400">Recorded State Snapshot / Payload:</div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
