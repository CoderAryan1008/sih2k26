import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Download, 
  ArrowRight, 
  Layers, 
  TrendingUp, 
  Building2 
} from 'lucide-react';

interface DashboardViewProps {
  onSelectApplication: (id: string) => void;
  onNavigateTo: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectApplication, onNavigateTo }) => {
  const { user, activeRole } = useAuth();
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardAnalytics();
      if (res.success) {
        setAnalytics(res);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeRole]);

  const kpis = analytics?.kpis || {
    totalApplications: 0,
    activePending: 0,
    approved: 0,
    overdueSla: 0,
    criticalRiskCount: 0,
    complianceFulfilmentRate: 100,
  };

  return (
    <div className="space-y-6">
      {/* View Header with Context & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-blue-400">
            {activeRole === 'institution_admin' ? 'Institutional Overview' : 'AICTE Regulatory Portal'}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-heading mt-0.5">
            {activeRole === 'institution_admin'
              ? `${user?.institution_name || 'Institution'} Dashboard`
              : activeRole === 'regional_officer'
              ? `${user?.region} Regional Dashboard`
              : 'AICTE Executive Oversight Dashboard'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stage tracking, pendency dwell times, compliance verification, and SLA risk monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/analytics/export/csv"
            download
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Apps */}
        <div 
          onClick={() => onNavigateTo('applications')} 
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Apps</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{kpis.totalApplications}</div>
          <div className="text-[10px] text-slate-400 mt-1">2026-27 Intake Dossiers</div>
        </div>

        {/* Active Pending */}
        <div 
          onClick={() => onNavigateTo('applications')} 
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">In Pipeline</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-300 mt-2">{kpis.activePending}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active Workflow Stages</div>
        </div>

        {/* Overdue SLA */}
        <div 
          onClick={() => onNavigateTo('alerts')} 
          className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 hover:border-rose-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase">Overdue SLA</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">{kpis.overdueSla}</div>
          <div className="text-[10px] text-rose-300/70 mt-1">Breached Processing SLA</div>
        </div>

        {/* Critical Risk */}
        <div 
          onClick={() => onNavigateTo('alerts')} 
          className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 hover:border-amber-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase">High/Critical</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">{kpis.criticalRiskCount}</div>
          <div className="text-[10px] text-amber-300/70 mt-1">Risk Score &gt; 55/100</div>
        </div>

        {/* Compliance Rate */}
        <div 
          onClick={() => onNavigateTo('compliance')} 
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{kpis.complianceFulfilmentRate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Undertakings Fulfilled</div>
        </div>

        {/* Approved */}
        <div 
          onClick={() => onNavigateTo('applications')} 
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-400 mt-2">{kpis.approved}</div>
          <div className="text-[10px] text-slate-400 mt-1">EoA / LoA Issued</div>
        </div>
      </div>

      {/* Main Grid: Stage Pendency Breakdown & Active Escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Pendency Funnel (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Stage-Wise Pendency & Dwell Times</h3>
            </div>
            <button
              onClick={() => onNavigateTo('bottlenecks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Bottleneck Intelligence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {analytics?.stageBreakdown?.map((st: any) => {
              const isBottleneck = st.count >= 2 || st.overdueCount > 0;
              return (
                <div key={st.stageCode} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{st.stageName}</span>
                      {st.overdueCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          {st.overdueCount} Overdue
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs">
                      <span className="font-bold text-white">{st.count}</span> applications • Avg dwell: <span className="font-bold text-amber-400">{st.avgDwellDays}d</span> / SLA: {st.slaDays}d
                    </div>
                  </div>

                  {/* Dwell bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${isBottleneck ? 'bg-amber-500' : 'bg-blue-500'} rounded-full`}
                      style={{ width: `${Math.min((st.count / Math.max(1, kpis.activePending)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Escalations Stream (1 Col) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Active Escalation Queue</h3>
            </div>
            <button
              onClick={() => onNavigateTo('alerts')}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {analytics?.recentAlerts?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No unresolved escalations in current queue.
              </div>
            ) : (
              analytics?.recentAlerts?.map((alt: any) => (
                <div
                  key={alt.id}
                  onClick={() => onNavigateTo('alerts')}
                  className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alt.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      Level {alt.escalation_level} • {alt.severity}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400">Risk: {alt.risk_score}/100</span>
                  </div>
                  <div className="font-semibold text-xs text-slate-200 line-clamp-1">{alt.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{alt.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Regional Workload Breakdown (For Senior Management & Super Admin) */}
      {activeRole !== 'institution_admin' && analytics?.regionBreakdown?.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">National Regional Workload Distribution</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {analytics.regionBreakdown.map((r: any) => (
              <div key={r.region} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-slate-200">{r.region} Region</div>
                <div className="text-lg font-extrabold text-blue-400">{r.total} Apps</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Approved: {r.approved}</span>
                  <span className={r.overdue > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>Overdue: {r.overdue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
