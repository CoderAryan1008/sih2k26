import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AlertItem } from '../types';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FastForward, 
  HelpCircle, 
  Sparkles, 
  UserCheck, 
  Filter 
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const { user, activeRole, triggerTimeLeap } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [isLeaping, setIsLeaping] = useState(false);

  // Acknowledge Modal
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [ackNotes, setAckNotes] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        escalationLevel: filterLevel !== '' ? filterLevel : undefined,
        severity: filterSeverity || undefined,
        isResolved: 0,
      });
      if (res.success) {
        setAlerts(res.alerts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterLevel, filterSeverity, activeRole]);

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      const res = await api.acknowledgeAlert(selectedAlert.id, ackNotes);
      if (res.success) {
        setAckModalOpen(false);
        setAckNotes('');
        await fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunSlaEngine = async () => {
    setIsLeaping(true);
    try {
      await triggerTimeLeap();
      await fetchAlerts();
    } finally {
      setIsLeaping(false);
    }
  };

  const getEscalationBadge = (level: number) => {
    switch (level) {
      case 3:
        return 'bg-purple-950 text-purple-300 border-purple-700/80 font-extrabold';
      case 2:
        return 'bg-rose-950 text-rose-300 border-rose-800 font-bold';
      case 1:
        return 'bg-amber-950 text-amber-300 border-amber-800 font-semibold';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-rose-400">Intelligent Escalation Engine</div>
          <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Escalation Queue & SLA Monitor</h2>
          <p className="text-xs text-slate-400 mt-1">
            Explainable multi-tier escalations (Level 1 Officer → Level 2 Regional → Level 3 Senior Management) with deduplication.
          </p>
        </div>

        <button
          onClick={handleRunSlaEngine}
          disabled={isLeaping}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer transition shadow-lg shadow-amber-500/10"
        >
          <FastForward className={`w-4 h-4 text-amber-400 ${isLeaping ? 'animate-spin' : ''}`} />
          <span>{isLeaping ? 'Evaluating SLAs...' : 'Simulate Time Leap / Run SLA Engine'}</span>
        </button>
      </div>

      {/* Escalation Hierarchy Architecture Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40">
          <div className="font-bold text-blue-300">Level 0: Advance Reminder</div>
          <p className="text-slate-400 text-[11px] mt-0.5">Dispatched 2-14 days before stage SLA expiry to responsible officer / institute.</p>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/40">
          <div className="font-bold text-amber-300">Level 1: Overdue Warning</div>
          <p className="text-slate-400 text-[11px] mt-0.5">Triggered immediately when stage dwell time exceeds statutory SLA days.</p>
        </div>
        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40">
          <div className="font-bold text-rose-300">Level 2: Regional Escalation</div>
          <p className="text-slate-400 text-[11px] mt-0.5">Overdue &gt; 2 days or repeated deficiency loops; escalated to Regional Officer.</p>
        </div>
        <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-900/40">
          <div className="font-bold text-purple-300">Level 3: Executive Bureau</div>
          <p className="text-slate-400 text-[11px] mt-0.5">Overdue &gt; 5 days; escalated directly to Member Secretary / Senior Management.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-300">Filters:</span>
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="">All Escalation Levels</option>
            <option value="0">Level 0 (Advance Reminders)</option>
            <option value="1">Level 1 (Officer SLA Overdue)</option>
            <option value="2">Level 2 (Regional Office Escalation)</option>
            <option value="3">Level 3 (Senior Management Escalation)</option>
          </select>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="URGENT">URGENT</option>
            <option value="WARNING">WARNING</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Active Escalations: <span className="font-bold text-rose-400">{alerts.length}</span>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
            No active escalations matching the selected criteria.
          </div>
        ) : (
          alerts.map(alt => (
            <div
              key={alt.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${getEscalationBadge(alt.escalation_level)}`}>
                    Level {alt.escalation_level} Escalation
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    alt.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {alt.severity}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Target Role: <span className="text-slate-200">{alt.responsible_role}</span>
                  </span>
                  {alt.is_acknowledged === 1 && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Acknowledged by {alt.ack_user_name || 'Supervisor'}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{alt.title}</h3>
                  <div className="text-[11px] text-blue-400 font-medium mt-0.5">{alt.institution_name}</div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{alt.message}</p>

                {alt.acknowledgement_notes && (
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-emerald-300 space-y-0.5">
                    <span className="font-semibold text-slate-400">Remedial Action Plan:</span>
                    <div>"{alt.acknowledgement_notes}"</div>
                  </div>
                )}
              </div>

              {/* Explainable Risk Score & Acknowledge Button */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Explainable Risk</div>
                  <div className="text-xl font-extrabold text-amber-400">{alt.risk_score}<span className="text-xs text-slate-500">/100</span></div>
                </div>

                {alt.is_acknowledged === 0 && ['regional_officer', 'senior_management', 'super_admin'].includes(activeRole) && (
                  <button
                    onClick={() => {
                      setSelectedAlert(alt);
                      setAckModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Acknowledge Escalation */}
      {ackModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAcknowledge} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Supervisor Escalation Acknowledgment</h3>
            <p className="text-xs text-slate-300">
              Alert: <span className="font-semibold text-blue-400">{selectedAlert.title}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Remedial Action Plan & Disposition:</label>
              <textarea
                value={ackNotes}
                onChange={e => setAckNotes(e.target.value)}
                placeholder="e.g. Issued 48h emergency compliance notice; directed regional officer to conduct scrutiny conference..."
                rows={4}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAckModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Log Acknowledgment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
