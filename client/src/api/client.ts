const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('aicte_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Auth
  getDemoAccounts: async () => {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return res.json();
  },

  switchRole: async (role: string) => {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Applications
  getApplications: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/applications?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  getApplicationDetail: async (id: string) => {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  createApplication: async (data: any) => {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  transitionApplication: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/applications/${id}/transition`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  addObservation: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/applications/${id}/observations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  respondObservation: async (appId: string, obsId: string, responseText: string) => {
    const res = await fetch(`${API_BASE}/applications/${appId}/observations/${obsId}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ responseText }),
    });
    return res.json();
  },

  resolveObservation: async (appId: string, obsId: string) => {
    const res = await fetch(`${API_BASE}/applications/${appId}/observations/${obsId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  reassignApplication: async (id: string, officerId: string, remarks?: string) => {
    const res = await fetch(`${API_BASE}/applications/${id}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ officerId, remarks }),
    });
    return res.json();
  },

  getApplicationSummary: async (id: string) => {
    const res = await fetch(`${API_BASE}/applications/${id}/summary`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Compliance
  getComplianceObligations: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/compliance?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  submitComplianceEvidence: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/compliance/${id}/submit-evidence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  reviewComplianceEvidence: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/compliance/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Documents
  getDocuments: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/documents?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  uploadDocument: async (data: any) => {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  replaceDocument: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/documents/${id}/replace`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  verifyDocument: async (id: string, status: string, notes?: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    return res.json();
  },

  // EVC
  getEvcVisits: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/evc?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  scheduleEvcVisit: async (data: any) => {
    const res = await fetch(`${API_BASE}/evc/schedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  rescheduleEvcVisit: async (id: string, newDate: string, reason: string) => {
    const res = await fetch(`${API_BASE}/evc/${id}/reschedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newDate, reason }),
    });
    return res.json();
  },

  completeEvcVisit: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/evc/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Alerts & Escalations
  getAlerts: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/alerts?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  acknowledgeAlert: async (id: string, notes: string) => {
    const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    return res.json();
  },

  runEscalationEngine: async () => {
    const res = await fetch(`${API_BASE}/alerts/run-engine`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Analytics
  getDashboardAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  getBottlenecks: async () => {
    const res = await fetch(`${API_BASE}/analytics/bottlenecks`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // System & AI
  getAuditLogs: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/system/audit-logs?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  getIntegrations: async () => {
    const res = await fetch(`${API_BASE}/system/integrations`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  searchAI: async (query: string) => {
    const res = await fetch(`${API_BASE}/ai/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query }),
    });
    return res.json();
  },

  resetDemo: async () => {
    const res = await fetch(`${API_BASE}/system/reset-demo`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
