import type { Request, Response, NextFunction } from 'express';
import type { SessionUser } from '../config/passport.js';
import { redisUserService } from '../server.js';
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
    // Fetch encrypted token from Redis
    const tokenData = await redisUserService.getToken(user.id.toString());

    if (!tokenData) {
      res.status(401).json({ error: 'GitHub token not found. Please re-authenticate.' });
      return;
    }

    // In E2E test mode, use mock token without decryption
    // This avoids encryption/decryption issues with test seed data
    let githubToken: string;
    if (process.env.E2E_TEST_MODE === 'true') {
      githubToken = 'mock-github-token-for-testing';
    } else {
      // Decrypt the token for production use
      githubToken = decryptToken({
        encryptedData: tokenData.accessTokenEncrypted,
        iv: tokenData.accessTokenIv,
        authTag: tokenData.accessTokenAuthTag,
      });
    }

    // Attach token to res.locals for use in route handlers
    res.locals.githubToken = githubToken;

    next();
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    res.status(500).json({ error: 'Failed to validate GitHub token' });
  }
}
