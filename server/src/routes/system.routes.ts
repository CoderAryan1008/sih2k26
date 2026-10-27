import { Router, Response } from 'express';
import { get, query, run } from '../db/database.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { AIAssistantService } from '../services/aiAssistantService.js';
import { seedDatabase } from '../db/seed.js';

const router = Router();

// GET /api/system/audit-logs - Query tamper-evident audit history
router.get('/audit-logs', requireAuth, requireRole('super_admin', 'senior_management', 'regional_officer'), (req: AuthenticatedRequest, res: Response) => {
  const { action, entityType, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  if (entityType) {
    sql += ' AND entity_type = ?';
    params.push(entityType);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const logs = query<any>(sql, params);
  const total = get<any>('SELECT count(*) as count FROM audit_logs')?.count || logs.length;

  res.json({
    success: true,
    total,
    logs: logs.map(l => ({
      ...l,
      details: l.details_json ? JSON.parse(l.details_json) : null,
    })),
  });
});

// GET /api/system/integrations - External services status and mock adapters
router.get('/integrations', requireAuth, (req, res) => {
  res.json({
    success: true,
    adapters: [
      {
        id: 'digilocker_land',
        name: 'DigiLocker & State Land Records Registry (Bhoomi/MahaBhulekh)',
        category: 'Land & Lease Title Verification',
        status: 'SIMULATED_HEALTHY',
        latencyMs: 142,
        lastSync: new Date().toISOString(),
        description: 'Simulates institutional land deed authenticity check against State Digital Cadastral maps.',
      },
      {
        id: 'nad_academic',
        name: 'National Academic Depository (NAD / ABC Portal)',
        category: 'Faculty Qualification Verification',
        status: 'SIMULATED_HEALTHY',
        latencyMs: 88,
        lastSync: new Date().toISOString(),
        description: 'Verifies faculty doctoral & postgraduate degree credentials with DigiLocker NAD repository.',
      },
      {
        id: 'gis_moe',
        name: 'Ministry of Education National GIS Infrastructure Portal',
        category: 'Geospatial Inspection & Infrastructure',
        status: 'SIMULATED_HEALTHY',
        latencyMs: 195,
        lastSync: new Date().toISOString(),
        description: 'Coordinates geo-tagged boundary coordinates for EVC on-site verification.',
      },
      {
        id: 'sms_email_gateway',
        name: 'NIC SMS & Meghraj Cloud Email Gateway',
        category: 'Statutory Notifications & Escalations',
        status: 'CONNECTED',
        latencyMs: 45,
        lastSync: new Date().toISOString(),
        description: 'Dispatches multi-channel alerts and reminders with delivery audit logging.',
      },
    ],
  });
});

// POST /api/ai/search - Explainable natural language search assistant
router.post('/ai/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { query: userQuery } = req.body;

  if (!userQuery) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  const result = AIAssistantService.searchAssistant(
    userQuery,
    user.role,
    user.region,
    user.institution_id
  );

  res.json({
    success: true,
    ...result,
  });
});

// POST /api/system/reset-demo - Resets the entire database to the clean SIH 2026 seed scenario
router.post('/reset-demo', requireAuth, requireRole('super_admin', 'senior_management'), (req, res) => {
  try {
    seedDatabase(true);
    res.json({
      success: true,
      message: 'Demo dataset successfully reset to initial pristine state with all roles, institutions, and test cases.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
