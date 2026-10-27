import React, { useState } from 'react';
import { X, Search, Sparkles, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

interface AISearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApplication: (id: string) => void;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({ isOpen, onClose, onSelectApplication }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.searchAI(query);
      if (res.success) {
        setSearchResult(res);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'Show overdue applications in Western Region',
    'Find applications with high or critical risk',
    'Applications in detailed scrutiny stage',
    'Approved applications in Southern Region',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-heading">
                AICTE Administrative Natural Language Search
              </h2>
              <p className="text-xs text-slate-400">
                Queries are safely parsed into validated queries with independent role permission boundaries.
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

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="py-4 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g., 'Show overdue compliance obligations in Western Region'..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Sample Prompts */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(sq);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {sq}
              </button>
            ))}
          </div>
        </form>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {searchResult && (
            <>
              {/* Intent Interpretation Box */}
              <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/50 text-xs flex items-center justify-between">
                <div>
                  <span className="text-blue-400 font-semibold">Interpreted Intent: </span>
                  <span className="text-slate-200">{searchResult.interpretedIntent}</span>
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {searchResult.totalMatches} match(es)
                </span>
              </div>

              {searchResult.results?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No applications matched the criteria within your authorized role scope.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResult.results?.map((app: any) => (
                    <div
                      key={app.id}
                      onClick={() => {
                        onSelectApplication(app.id);
                        onClose();
                      }}
                      className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-blue-400">{app.application_number}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                            {app.current_stage}
                          </span>
                          {app.risk_level === 'CRITICAL' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-xs text-slate-200">{app.institution_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {app.program_discipline} • {app.region} Region • Officer: {app.officer_name || 'Unassigned'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Risk Score</div>
                          <div className="text-xs font-bold text-amber-400">{app.priority_score}/100</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
