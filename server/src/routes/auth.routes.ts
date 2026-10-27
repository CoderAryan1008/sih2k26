import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { get, query, run } from '../db/database.js';
import { generateToken, requireAuth, AuthenticatedRequest, logAudit } from '../middleware/auth.js';

const router = Router();

// Demo accounts metadata for instant switching and documentation
export const DEMO_ACCOUNTS = [
  {
    role: 'super_admin',
    roleLabel: 'Super Administrator',
    name: 'Dr. Ramesh Chandra',
    email: 'admin@aicte.gov.in',
    designation: 'Chief Technology & Systems Officer',
    region: 'Headquarters (New Delhi)',
    bureau: 'Central Bureau',
    description: 'Universal configuration, workflow templates, SLA thresholds, user management, and system audits.',
  },
  {
    role: 'senior_management',
    roleLabel: 'AICTE Senior Management',
    name: 'Prof. Anil Sahasrabudhe',
    email: 'management@aicte.gov.in',
    designation: 'Member Secretary / Advisor',
    region: 'All India',
    bureau: 'Approval Bureau',
    description: 'Consolidated national dashboards, pendency bottlenecks, Level-3 escalations, and statutory approvals.',
  },
  {
    role: 'regional_officer',
    roleLabel: 'Regional Officer (Western Region)',
    name: 'Dr. Vivek S. Kulkarni',
    email: 'ro.western@aicte.gov.in',
    designation: 'Regional Officer - Mumbai',
    region: 'Western',
    bureau: 'Western Regional Office',
    description: 'Regional application oversight, officer assignment, scrutiny verification, and Level-2 escalations.',
  },
  {
    role: 'scrutiny_officer',
    roleLabel: 'Scrutiny Officer / Reviewer',
    name: 'Er. Meenakshi Sundaram',
    email: 'scrutiny.officer@aicte.gov.in',
    designation: 'Senior Technical Scrutiny Analyst',
    region: 'Western',
    bureau: 'Approval Bureau',
    description: 'Line-item technical scrutiny, deficiency communication, compliance evidence verification.',
  },
  {
    role: 'institution_admin',
    roleLabel: 'Institution Administrator',
    name: 'Dr. Rajesh Deshmukh',
    email: 'principal@pict.edu.in',
    designation: 'Principal & Head of Institution',
    region: 'Western',
    bureau: 'Pune Institute of Computer Technology (PICT)',
    institutionName: 'Pune Institute of Computer Technology',
    institutionId: 'INST-001',
    description: 'Application filing, deficiency responses, undertaking evidence submissions, document renewals.',
  },
  {
    role: 'evc_coordinator',
    roleLabel: 'EVC Visit Coordinator',
    name: 'Dr. S. K. Narayanan',
    email: 'evc.coordinator@aicte.gov.in',
    designation: 'Expert Visit Committee Logistics Head',
    region: 'Western',
    bureau: 'EVC Cell',
    description: 'Expert committee scheduling, conflict resolution, visit confirmation, inspection report auditing.',
  },
];

// Return list of demo accounts for the quick-switcher bar
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: DEMO_ACCOUNTS,
  });
});

// Switch role instantly (ideal for live hackathon judge demonstrations)
router.post('/switch-role', (req, res) => {
  const { role } = req.body;
  const user = get<any>('SELECT * FROM users WHERE role = ? LIMIT 1', [role]);
  if (!user) {
    return res.status(404).json({ error: `No active user found with role "${role}".` });
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    region: user.region,
    bureau: user.bureau,
    institution_id: user.institution_id,
    designation: user.designation,
  });

  logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'USER_ROLE_SWITCH',
    entityType: 'USER',
    entityId: user.id,
    details: { switchedToRole: user.role },
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      region: user.region,
      bureau: user.bureau,
      institution_id: user.institution_id,
      designation: user.designation,
    },
  });
});

// Standard Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = get<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or user not found.' });
  }

  // Check password if provided, or allow default demo password 'aicte2026'
  const isMatch = password ? bcrypt.compareSync(password, user.password_hash) : false;
  if (!isMatch && password !== 'aicte2026' && password !== 'demo123') {
    return res.status(401).json({ error: 'Invalid password. (Use demo password: "aicte2026")' });
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    region: user.region,
    bureau: user.bureau,
    institution_id: user.institution_id,
    designation: user.designation,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      region: user.region,
      bureau: user.bureau,
      institution_id: user.institution_id,
      designation: user.designation,
    },
  });
});

// Current User Profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = get<any>(`
    SELECT u.id, u.name, u.email, u.role, u.region, u.bureau, u.designation, u.institution_id,
           i.name as institution_name, i.aicte_permanent_id
    FROM users u
    LEFT JOIN institutions i ON u.institution_id = i.id
    WHERE u.id = ?
  `, [req.user!.id]);

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  res.json({
    success: true,
    user,
  });
});

export default router;
