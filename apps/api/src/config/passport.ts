import passport from 'passport';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import pool from '../db/connection.js';
import { encryptToken } from '../services/token.service.js';

/**
 * User object stored in session
 */
export interface SessionUser {
  id: number;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Configure Passport.js with GitHub OAuth strategy
 */
export function configurePassport(): void {
  // Serialize user to session (only store user ID)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (fetch full user data from database)
  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await pool.query(
        'SELECT id, github_id, username, email, avatar_url FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      const user: SessionUser = {
        id: result.rows[0].id,
        githubId: result.rows[0].github_id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        avatarUrl: result.rows[0].avatar_url,
      };

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  });

  // Configure GitHub OAuth strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: process.env.GITHUB_CALLBACK_URL!,
        scope: ['repo', 'user:email'], // Request repo and email scopes
      },
      async (
        accessToken: string,
        _refreshToken: string,
        profile: GitHubProfile,
        done: (error: any, user?: any) => void
      ) => {
        try {
          const githubId = profile.id;
          const username = profile.username || profile.displayName || 'unknown';
          const email = profile.emails && profile.emails.length > 0 ? (profile.emails[0]?.value ?? null) : null;
          const avatarUrl = profile.photos && profile.photos.length > 0 ? (profile.photos[0]?.value ?? null) : null;

          // Check if user already exists
          const existingUserResult = await pool.query(
            'SELECT id FROM users WHERE github_id = $1',
            [githubId]
          );

          let userId: number;

          if (existingUserResult.rows.length > 0) {
            // Update existing user
            userId = existingUserResult.rows[0].id;
            await pool.query(
              'UPDATE users SET username = $1, email = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4',
              [username, email, avatarUrl, userId]
            );
          } else {
            // Create new user
            const newUserResult = await pool.query(
              'INSERT INTO users (github_id, username, email, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id',
              [githubId, username, email, avatarUrl]
            );
            userId = newUserResult.rows[0].id;
          }

          // Encrypt and store access token
          const encrypted = encryptToken(accessToken);

          // Delete existing tokens for this user and provider
          await pool.query(
            'DELETE FROM user_tokens WHERE user_id = $1 AND provider = $2',
            [userId, 'github']
          );

          // Store new encrypted token
          await pool.query(
            `INSERT INTO user_tokens
             (user_id, provider, access_token_encrypted, access_token_iv, access_token_auth_tag, token_type, scope)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              userId,
              'github',
              encrypted.encryptedData,
              encrypted.iv,
              encrypted.authTag,
              'bearer',
              'repo,user:email',
            ]
          );

          // Return user object for session
          const user: SessionUser = {
            id: userId,
            githubId,
            username,
            email,
            avatarUrl,
          };

          done(null, user);
        } catch (error) {
          console.error('Error during GitHub OAuth callback:', error);
          done(error, undefined);
        }
      }
    )
  );
}

/**
 * Validate required environment variables for GitHub OAuth
 * @throws Error if required variables are missing
 */
export function validateOAuthConfig(): void {
  const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
