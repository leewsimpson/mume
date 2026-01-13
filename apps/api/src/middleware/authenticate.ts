import type { Request, Response, NextFunction } from 'express';
import type { SessionUser } from '../config/passport.js';

/**
 * Authentication middleware
 * Checks if user is authenticated via session
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  console.log('[AUTH] isAuthenticated:', req.isAuthenticated(), 'user:', req.user ? 'exists' : 'null', 'sessionID:', req.sessionID);
  
  if (!req.isAuthenticated() || !req.user) {
    console.log('[AUTH] Authentication failed - returning 401');
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  console.log('[AUTH] Authentication successful for user:', (req.user as SessionUser).username);
  next();
}

/**
 * Type guard to assert that req.user exists and is a SessionUser
 */
export function assertAuthenticated(req: Request): asserts req is Request & { user: SessionUser } {
  if (!req.user) {
    throw new Error('User is not authenticated');
  }
}
