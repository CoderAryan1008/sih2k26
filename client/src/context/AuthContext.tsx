import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DemoAccount, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  demoAccounts: DemoAccount[];
  loading: boolean;
  activeRole: UserRole;
  unreadAlertCount: number;
  switchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAlertCount: () => Promise<void>;
  triggerTimeLeap: () => Promise<any>;
  resetDemoScenario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<UserRole>('super_admin');
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);

  const refreshUser = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        setActiveRole(res.user.role);
      }
    } catch (e) {
      console.error('Failed to fetch user:', e);
    }
  };

  const refreshAlertCount = async () => {
    try {
      const res = await api.getAlerts({ isResolved: 0 });
      if (res.success) {
        setUnreadAlertCount(res.count || 0);
      }
    } catch (e) {
      // Ignore
    }
  };

  const switchRole = async (role: UserRole) => {
    setLoading(true);
    try {
      const res = await api.switchRole(role);
      if (res.success && res.token) {
        localStorage.setItem('aicte_token', res.token);
        setUser(res.user);
        setActiveRole(res.user.role);
        await refreshAlertCount();
      }
    } catch (e) {
      console.error('Failed to switch role:', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerTimeLeap = async () => {
    const res = await api.runEscalationEngine();
    await refreshAlertCount();
    return res;
  };

  const resetDemoScenario = async () => {
    setLoading(true);
    try {
      await api.resetDemo();
      await refreshUser();
      await refreshAlertCount();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const demoRes = await api.getDemoAccounts();
        if (demoRes.success) {
          setDemoAccounts(demoRes.accounts);
        }

        const token = localStorage.getItem('aicte_token');
        if (!token) {
          // Initialize by default as super_admin for instant seamless hackathon demo
          await switchRole('super_admin');
        } else {
          await refreshUser();
          await refreshAlertCount();
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        demoAccounts,
        loading,
        activeRole,
        unreadAlertCount,
        switchRole,
        refreshUser,
        refreshAlertCount,
        triggerTimeLeap,
        resetDemoScenario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
