import type { Request, Response, NextFunction } from 'express';
import type { SessionUser } from '../config/passport.js';
import pool from '../db/connection.js';
import { decryptToken } from '../services/token.service.js';

/**
 * Extended request interface with GitHub token
 */
export interface RequestWithGitHubToken extends Request {
  user: SessionUser;
  githubToken: string;
}

/**
 * Middleware to validate and attach GitHub token to request
 * Fetches and decrypts the GitHub access token for the authenticated user
 */
export async function validateGitHubToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = req.user as SessionUser;

  try {
    // Fetch encrypted token from database
    const result = await pool.query(
      `SELECT access_token_encrypted, access_token_iv, access_token_auth_tag
       FROM user_tokens
       WHERE user_id = $1 AND provider = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, 'github']
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'GitHub token not found. Please re-authenticate.' });
      return;
    }

    const tokenData = result.rows[0];

    // Decrypt the token
    const githubToken = decryptToken({
      encryptedData: tokenData.access_token_encrypted,
      iv: tokenData.access_token_iv,
      authTag: tokenData.access_token_auth_tag,
    });

    // Attach token to res.locals for use in route handlers
    res.locals.githubToken = githubToken;

    next();
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    res.status(500).json({ error: 'Failed to validate GitHub token' });
  }
}
