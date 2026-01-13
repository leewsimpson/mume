import { Router } from 'express';
import passport from 'passport';
import type { SessionUser } from '../config/passport.js';
import { redisUserService } from '../server.js';

const router = Router();

/**
 * POST /auth/test-login
 * Test-only endpoint for E2E testing - bypasses OAuth flow
 * Only available when E2E_TEST_MODE environment variable is set
 */
router.post('/test-login', async (req, res) => {
  // Only allow in test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Fetch user from Redis
    const redisUser = await redisUserService.getUserById(userId.toString());

    if (!redisUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user: SessionUser = {
      id: parseInt(redisUser.id, 10),
      githubId: redisUser.githubId,
      username: redisUser.username,
      email: redisUser.email,
      avatarUrl: redisUser.avatarUrl,
    };

    // Log the user in via Passport
    req.login(user, (err) => {
      if (err) {
        console.error('Test login error:', err);
        return res.status(500).json({ error: 'Failed to login' });
      }

      res.json({ message: 'Logged in successfully', user });
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req, _res, next) => {
  console.log('[AUTH] GitHub OAuth initiated', { 
    sessionID: req.sessionID,
    cookies: req.headers.cookie ? 'present' : 'none'
  });
  next();
}, passport.authenticate('github', { scope: ['repo', 'user:email'] }));

/**
 * GET /auth/github/callback
 * GitHub OAuth callback endpoint
 */
router.get(
  '/github/callback',
  (req, _res, next) => {
    console.log('[AUTH] GitHub callback received', {
      sessionID: req.sessionID,
      query: req.query.code ? 'code present' : 'no code',
      cookies: req.headers.cookie ? 'present' : 'none'
    });
    next();
  },
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('[AUTH] GitHub auth successful', {
      sessionID: req.sessionID,
      user: req.user ? (req.user as SessionUser).username : 'none',
      redirectTo: `${process.env.FRONTEND_URL}/repositories`
    });
    // Successful authentication, redirect to frontend repository selector
    res.redirect(`${process.env.FRONTEND_URL}/repositories`);
  }
);

/**
 * GET /auth/user
 * Get current authenticated user info
 */
router.get('/user', (req, res) => {
  console.log('[AUTH] User check', {
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    cookies: req.headers.cookie ? 'present' : 'none',
    cookieHeader: req.headers.cookie?.substring(0, 50) || 'none'
  });
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.user as SessionUser;

  res.json({
    user: {
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
});

/**
 * GET /auth/logout
 * Log out the current user
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Error destroying session:', destroyErr);
        return res.status(500).json({ error: 'Failed to destroy session' });
      }

      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
