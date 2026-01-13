import passport from 'passport';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { encryptToken } from '../services/token.service.js';
import { redisUserService } from '../server.js';

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

  // Deserialize user from session (fetch full user data from Redis)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const redisUser = await redisUserService.getUserById(id);

      if (!redisUser) {
        return done(null, false);
      }

      const user: SessionUser = {
        id: parseInt(redisUser.id, 10),
        githubId: redisUser.githubId,
        username: redisUser.username,
        email: redisUser.email,
        avatarUrl: redisUser.avatarUrl,
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

          // Save or update user in Redis
          const redisUser = await redisUserService.saveUser({
            githubId,
            username,
            email,
            avatarUrl,
          });

          // Encrypt and store access token
          const encrypted = encryptToken(accessToken);

          await redisUserService.saveToken(redisUser.id, {
            accessTokenEncrypted: encrypted.encryptedData,
            accessTokenIv: encrypted.iv,
            accessTokenAuthTag: encrypted.authTag,
            provider: 'github',
            scope: 'repo,user:email',
            tokenType: 'bearer',
            expiresAt: null,
          });

          // Return user object for session
          const user: SessionUser = {
            id: parseInt(redisUser.id, 10),
            githubId: redisUser.githubId,
            username: redisUser.username,
            email: redisUser.email,
            avatarUrl: redisUser.avatarUrl,
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
