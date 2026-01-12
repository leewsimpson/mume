import { Router } from 'express';
import passport from 'passport';
import type { SessionUser } from '../config/passport.js';
import pool from '../db/connection.js';

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
    // Fetch user from database
    const result = await pool.query(
      'SELECT id, github_id, username, email, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dbUser = result.rows[0];
    const user: SessionUser = {
      id: dbUser.id,
      githubId: dbUser.github_id,
      username: dbUser.username,
      email: dbUser.email,
      avatarUrl: dbUser.avatar_url,
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
router.get('/github', passport.authenticate('github', { scope: ['repo', 'user:email'] }));

/**
 * GET /auth/github/callback
 * GitHub OAuth callback endpoint
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (_req, res) => {
    // Successful authentication, redirect to frontend repository selector
    res.redirect(`${process.env.FRONTEND_URL}/repositories`);
  }
);

/**
 * GET /auth/user
 * Get current authenticated user info
 */
router.get('/user', (req, res) => {
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
