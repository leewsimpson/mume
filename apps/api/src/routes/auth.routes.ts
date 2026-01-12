import { Router } from 'express';
import passport from 'passport';
import type { SessionUser } from '../config/passport.js';

const router = Router();

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
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
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
