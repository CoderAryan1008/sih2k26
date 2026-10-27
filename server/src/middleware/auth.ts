import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { get, run } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'aicte_sih_2026_super_secure_workflow_key_!@#$';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'senior_management' | 'regional_officer' | 'scrutiny_officer' | 'institution_admin' | 'evc_coordinator';
  region?: string;
  bureau?: string;
  institution_id?: string;
  designation?: string;
}

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      region: user.region,
      bureau: user.bureau,
      institution_id: user.institution_id,
      designation: user.designation,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No valid Bearer token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === 'super_admin') {
      return next(); // Super admin has universal override
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Your role (${req.user.role}) is not authorized for this action. Required: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Ensures institution_admin can never access or query records belonging to another institution
 */
export function enforceInstitutionScope(
  req: AuthenticatedRequest,
  res: Response,
  targetInstitutionId: string | undefined
): boolean {
  if (!req.user) return false;
  if (req.user.role === 'institution_admin') {
    if (!req.user.institution_id || req.user.institution_id !== targetInstitutionId) {
      res.status(403).json({
        error: 'Data Isolation Violation: You are not authorized to view or modify records belonging to another institution.',
      });
      return false;
    }
  }
  return true;
}

/**
 * System audit logging helper
 */
export function logAudit(params: {
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
}) {
  const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    run(
      `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        params.actorId || null,
        params.actorName,
        params.actorRole,
        params.action,
        params.entityType,
        params.entityId,
        JSON.stringify(params.details || {}),
        params.ipAddress || '127.0.0.1',
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
