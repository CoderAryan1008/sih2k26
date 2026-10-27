import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  FastForward, 
  Sparkles, 
  Bell, 
  HelpCircle, 
  RotateCcw, 
  ChevronDown, 
  Building2, 
  UserCheck, 
  Flame, 
  Briefcase 
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onOpenTour: () => void;
  onOpenAISearch: () => void;
  onSelectView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTour, onOpenAISearch, onSelectView }) => {
  const { user, demoAccounts, activeRole, unreadAlertCount, switchRole, triggerTimeLeap, resetDemoScenario } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isLeaping, setIsLeaping] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleTimeLeap = async () => {
    setIsLeaping(true);
    try {
      const res = await triggerTimeLeap();
      setToastMsg(`SLA Engine executed: ${res.alertsGenerated || 0} alerts processed, ${res.escalationsTriggered || 0} escalations triggered.`);
      setTimeout(() => setToastMsg(null), 4500);
    } catch (e: any) {
      setToastMsg('Failed to trigger SLA engine.');
    } finally {
      setIsLeaping(false);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset all demo data to pristine SIH 2026 starting scenario?')) {
      await resetDemoScenario();
      setToastMsg('Dataset restored to default seed scenario.');
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'senior_management': return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'regional_officer': return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'scrutiny_officer': return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'institution_admin': return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'evc_coordinator': return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const currentAccount = demoAccounts.find(a => a.role === activeRole);

  return (
    <>
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 text-sm text-white bg-slate-900 border border-blue-500 rounded-lg shadow-2xl animate-bounce">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Demo Bar for Hackathon Judges */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 border-b border-blue-900/40 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-200">SIH 2026 LIVE DEMO MODE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">Role-Based AICTE Approval & Compliance Automation</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 14-Step Interactive Demo Walkthrough */}
          <button
            onClick={onOpenTour}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 font-medium transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Demo Tour (14 Steps)</span>
          </button>

          {/* Simulate Time Leap / Trigger SLA Engine */}
          <button
            onClick={handleTimeLeap}
            disabled={isLeaping}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium transition cursor-pointer"
            title="Runs automated SLA checker, advances deadlines, and triggers escalation levels"
          >
            <FastForward className={`w-3.5 h-3.5 text-amber-400 ${isLeaping ? 'animate-spin' : ''}`} />
            <span>{isLeaping ? 'Evaluating SLAs...' : 'Simulate Time Leap / Run SLA Engine'}</span>
          </button>

          {/* Reset Demo State */}
          <button
            onClick={handleResetDemo}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Restore pristine seed scenario"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main Persistent Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectView('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-extrabold text-lg">
              AICTE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight font-heading">
                  AICTE Approval & Compliance Engine
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SIH 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Approval Workflow Automation • Compliance Monitoring • Intelligent Escalations
              </p>
            </div>
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* AI Natural Language Search Modal Trigger */}
            <button
              onClick={onOpenAISearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Ask AI Assistant...</span>
              <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-slate-900 border border-slate-700 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => onSelectView('alerts')}
              className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
              title="Escalations & Alerts"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${getRoleBadgeColor(activeRole)}`}
              >
                <ShieldCheck className="w-4 h-4" />
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] opacity-75 uppercase">Active Role:</div>
                  <div className="font-bold">{currentAccount?.roleLabel || activeRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                    <span className="font-bold text-slate-200">Switch Role for Judge Demonstration</span>
                    <p className="text-[11px] mt-0.5 text-slate-400">
                      Instantly authenticates you with that role's backend permissions & data isolation.
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto py-1">
                    {demoAccounts.map(account => (
                      <button
                        key={account.role}
                        onClick={() => {
                          switchRole(account.role);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 hover:bg-slate-800/80 transition cursor-pointer ${
                          activeRole === account.role ? 'bg-blue-950/40 border-l-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="mt-0.5">
                          {account.role === 'institution_admin' ? (
                            <Building2 className="w-4 h-4 text-emerald-400" />
                          ) : account.role === 'senior_management' ? (
                            <Briefcase className="w-4 h-4 text-blue-400" />
                          ) : account.role === 'super_admin' ? (
                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                          ) : account.role === 'evc_coordinator' ? (
                            <Flame className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-200 flex items-center justify-between">
                            <span>{account.roleLabel}</span>
                            {activeRole === account.role && (
                              <span className="text-[10px] text-blue-400 font-bold">ACTIVE</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{account.name} • {account.designation}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{account.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
