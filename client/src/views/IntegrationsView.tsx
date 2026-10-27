import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Network, CheckCircle2, RefreshCw, Send, ShieldCheck, Database, MapPin, Mail } from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [adapters, setAdapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testSimResult, setTestSimResult] = useState<string | null>(null);

  const fetchAdapters = async () => {
    setLoading(true);
    try {
      const res = await api.getIntegrations();
      if (res.success) {
        setAdapters(res.adapters);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdapters();
  }, []);

  const handleTestDigiLocker = () => {
    setTestSimResult('Simulating DigiLocker Land Title Query for PICT Pune (Survey 27)...');
    setTimeout(() => {
      setTestSimResult(JSON.stringify({
        status: 'AUTHENTIC_VERIFIED',
        stateRegistry: 'MahaBhulekh Pune Division',
        surveyNumber: '27/1, 27/2 Dhankawadi',
        tenureType: 'Registered Educational Long-Term Lease (30 Years)',
        digitalSignature: 'SHA256:8f24b8109d37e61a... [VALID]',
        timestamp: new Date().toISOString(),
      }, null, 2));
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase font-bold tracking-wider text-blue-400">External Interoperability & Architecture</div>
        <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Integrations & External Adapters Status</h2>
        <p className="text-xs text-slate-400 mt-1">
          Architectural boundaries with clearly labelled simulated adapters for DigiLocker, NAD, and MoE GIS portals.
        </p>
      </div>

      {/* Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adapters.map(ad => (
          <div key={ad.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                {ad.id === 'digilocker_land' ? (
                  <Database className="w-4 h-4 text-blue-400" />
                ) : ad.id === 'gis_moe' ? (
                  <MapPin className="w-4 h-4 text-emerald-400" />
                ) : ad.id === 'sms_email_gateway' ? (
                  <Mail className="w-4 h-4 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                )}
                <span>{ad.name}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {ad.status}
              </span>
            </div>

            <p className="text-xs text-slate-300">{ad.description}</p>

            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Category: <span className="text-slate-200 font-medium">{ad.category}</span></span>
              <span>Latency: <span className="text-emerald-400 font-bold">{ad.latencyMs} ms</span></span>
            </div>

            {ad.id === 'digilocker_land' && (
              <button
                onClick={handleTestDigiLocker}
                className="w-full mt-2 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 font-semibold text-xs cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Digital Land Title Verification</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Simulator Response Box */}
      {testSimResult && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-900/60 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Simulated DigiLocker API Response Payload
            </span>
            <button
              onClick={() => setTestSimResult(null)}
              className="text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
            {testSimResult}
          </pre>
        </div>
      )}
    </div>
  );
};
