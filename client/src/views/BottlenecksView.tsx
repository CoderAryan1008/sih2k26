import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  Users, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Clock 
} from 'lucide-react';

export const BottlenecksView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBottlenecks = async () => {
    setLoading(true);
    try {
      const res = await api.getBottlenecks();
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, [activeRole]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase font-bold tracking-wider text-blue-400">Algorithmic Workload Diagnostics</div>
        <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Stage-Wise Pendency & Bottleneck Intelligence</h2>
        <p className="text-xs text-slate-400 mt-1">
          Identifies accumulated pipelines, abnormal stage dwell times, repeat correction loops, and workload distribution imbalances.
        </p>
      </div>

      {/* Algorithmic Flags & Insights */}
      {data?.insights?.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/50 space-y-2">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AICTE Systemic Bottleneck Alerts ({data.insights.length})</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-200">
            {data.insights.map((ins: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Dwell Times & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Dwell Time Analytics */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Stage-Wise Volume & Dwell Time</h3>
          </div>

          <div className="space-y-3">
            {data?.stageStats?.map((st: any) => (
              <div key={st.stage} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{st.stage}</span>
                  <div className="text-slate-400">
                    <span className="font-bold text-white">{st.count}</span> applications
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Avg Stage Dwell: <span className="font-bold text-amber-400">{st.avgDays} days</span></span>
                  <span>Max Dwell: <span className="font-bold text-rose-400">{st.maxDays} days</span></span>
                </div>

                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${st.avgDays > 7 ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((st.count / 4) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Workload & Repeat Delay Intelligence */}
        <div className="space-y-6">
          {/* Repeat Correction Loops */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Repeat Deficiency Cycle Detection</h3>
            </div>
            <p className="text-xs text-slate-300">
              Applications cycling repeatedly between scrutiny and institutional deficiencies indicate persistent regulatory non-compliance or unclear instructions.
            </p>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-300 font-medium">Applications with &gt; 2 Scrutiny Rounds:</span>
              <span className="text-base font-extrabold text-amber-400">{data?.repeatCorrectionCount || 0}</span>
            </div>
          </div>

          {/* Scrutiny Team Workload Distribution */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Officer Workload & Overdue Allocation</h3>
            </div>

            <div className="space-y-2">
              {data?.officerWorkload?.map((off: any) => (
                <div key={off.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{off.name}</div>
                    <div className="text-[11px] text-slate-400">{off.region} Regional Bureau</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-400">{off.assigned_applications} Assigned</div>
                    <div className={`text-[10px] font-semibold ${off.overdue_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {off.overdue_count} Overdue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
