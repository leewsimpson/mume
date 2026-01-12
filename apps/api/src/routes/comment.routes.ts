import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateGitHubToken } from '../middleware/validateGitHubToken.js';
import pool from '../db/connection.js';
import type { SessionUser } from '../config/passport.js';

const router = Router();

/**
 * POST /api/comments
 * Create a new comment on a specific text range in a document
 */
router.post(
  '/',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const { documentPath, repoOwner, repoName, charStart, charEnd, text } = req.body;
      const user = req.user as SessionUser;
      const userId = user?.id;

      // Validation
      if (!documentPath || !repoOwner || !repoName || charStart === undefined || charEnd === undefined || !text) {
        return res.status(400).json({
          error: 'Missing required fields: documentPath, repoOwner, repoName, charStart, charEnd, text'
        });
      }

      if (typeof charStart !== 'number' || typeof charEnd !== 'number') {
        return res.status(400).json({
          error: 'charStart and charEnd must be numbers'
        });
      }

      if (charStart < 0 || charEnd < charStart) {
        return res.status(400).json({
          error: 'Invalid character range: charStart must be >= 0 and charEnd must be >= charStart'
        });
      }

      if (!text.trim()) {
        return res.status(400).json({
          error: 'Comment text cannot be empty'
        });
      }

      // Insert comment into database
      const result = await pool.query(
        `INSERT INTO comments (user_id, document_path, repo_owner, repo_name, char_start, char_end, text, resolved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())
         RETURNING id, user_id, document_path, repo_owner, repo_name, char_start, char_end, text, resolved, created_at, updated_at`,
        [userId, documentPath, repoOwner, repoName, charStart, charEnd, text.trim()]
      );

      const comment = result.rows[0];

      // Fetch user info to include in response
      const userResult = await pool.query(
        'SELECT id, username, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const commentWithUser = {
        ...comment,
        user: userResult.rows[0]
      };

      req.logger?.info('Comment created successfully', {
        userId,
        commentId: comment.id,
        repoOwner,
        repoName,
        documentPath,
        operation: 'create_comment'
      });

      res.status(201).json(commentWithUser);
    } catch (error) {
      req.logger?.error('Failed to create comment', error as Error, {
        userId: (req.user as SessionUser)?.id,
        operation: 'create_comment'
      });
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

/**
 * GET /api/repositories/:owner/:repo/files/:path/comments
 * Get all comments for a specific document
 */
router.get(
  '/repositories/:owner/:repo/files/**/comments',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const owner = req.params.owner;
      const repo = req.params.repo;
      const filePath = (req.params as Record<string, string>)['0']; // Wildcard path

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Fetch comments with user information
      const result = await pool.query(
        `SELECT c.id, c.user_id, c.document_path, c.repo_owner, c.repo_name,
                c.char_start, c.char_end, c.text, c.resolved, c.created_at, c.updated_at,
                u.username, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.repo_owner = $1 AND c.repo_name = $2 AND c.document_path = $3
         ORDER BY c.char_start ASC, c.created_at ASC`,
        [owner, repo, filePath]
      );

      const comments = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        documentPath: row.document_path,
        repoOwner: row.repo_owner,
        repoName: row.repo_name,
        charStart: row.char_start,
        charEnd: row.char_end,
        text: row.text,
        resolved: row.resolved,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row.user_id,
          username: row.username,
          avatarUrl: row.avatar_url
        }
      }));

      req.logger?.info('Comments fetched successfully', {
        owner,
        repo,
        filePath,
        commentCount: comments.length,
        operation: 'fetch_comments'
      });

      res.json(comments);
    } catch (error) {
      req.logger?.error('Failed to fetch comments', error as Error, {
        owner: req.params.owner,
        repo: req.params.repo,
        operation: 'fetch_comments'
      });
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }
);

export default router;
