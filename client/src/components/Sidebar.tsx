import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  Files, 
  CalendarClock, 
  AlertTriangle, 
  TrendingUp, 
  History, 
  Network 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView }) => {
  const { user, unreadAlertCount, activeRole } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin', 'evc_coordinator'],
    },
    {
      id: 'applications',
      label: 'Approval Workflows',
      icon: FileText,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin', 'evc_coordinator'],
    },
    {
      id: 'compliance',
      label: 'Compliance Undertakings',
      icon: ClipboardCheck,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin'],
    },
    {
      id: 'documents',
      label: 'Document Registry',
      icon: Files,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin'],
    },
    {
      id: 'evc',
      label: 'EVC Visit Coordination',
      icon: CalendarClock,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'evc_coordinator', 'institution_admin'],
    },
    {
      id: 'alerts',
      label: 'Escalation Queue',
      icon: AlertTriangle,
      badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin', 'evc_coordinator'],
    },
    {
      id: 'bottlenecks',
      label: 'Bottleneck Intelligence',
      icon: TrendingUp,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer'],
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      roles: ['super_admin', 'senior_management', 'regional_officer'],
    },
    {
      id: 'integrations',
      label: 'DigiLocker & Adapters',
      icon: Network,
      roles: ['super_admin', 'senior_management', 'regional_officer', 'scrutiny_officer', 'institution_admin', 'evc_coordinator'],
    },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(activeRole));

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* User Scope Info Banner */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
          <div className="text-slate-400 font-medium">Logged in User:</div>
          <div className="font-bold text-slate-200 truncate mt-0.5">{user?.name || 'Administrator'}</div>
          <div className="text-[11px] text-blue-400 font-medium mt-0.5 truncate">
            {user?.role === 'institution_admin' 
              ? (user.institution_name || 'PICT Pune (INST-001)') 
              : `${user?.region || 'All India'} • ${user?.designation || user?.role}`}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>SLA Clock Engine:</span>
          <span className="text-emerald-400 font-medium">Active (Simulated)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Academic Year:</span>
          <span className="text-slate-300 font-medium">2026-2027</span>
        </div>
        <div className="flex items-center justify-between">
          <span>AICTE Security Mode:</span>
          <span className="text-blue-400 font-medium">RBAC Enforced</span>
        </div>
      </div>
    </aside>
  );
};
