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

      // Fetch all replies for these comments
      const commentIds = result.rows.map((row: any) => row.id);
      let repliesMap = new Map<number, any[]>();

      if (commentIds.length > 0) {
        const repliesResult = await pool.query(
          `SELECT r.id, r.comment_id, r.user_id, r.text, r.created_at, r.updated_at,
                  u.username, u.avatar_url
           FROM comment_replies r
           JOIN users u ON r.user_id = u.id
           WHERE r.comment_id = ANY($1)
           ORDER BY r.created_at ASC`,
          [commentIds]
        );

        // Group replies by comment_id
        for (const reply of repliesResult.rows) {
          if (!repliesMap.has(reply.comment_id)) {
            repliesMap.set(reply.comment_id, []);
          }
          repliesMap.get(reply.comment_id)!.push({
            id: reply.id,
            commentId: reply.comment_id,
            userId: reply.user_id,
            text: reply.text,
            createdAt: reply.created_at,
            updatedAt: reply.updated_at,
            user: {
              id: reply.user_id,
              username: reply.username,
              avatarUrl: reply.avatar_url
            }
          });
        }
      }

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
        },
        replies: repliesMap.get(row.id) || []
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

/**
 * POST /api/comments/:commentId/replies
 * Create a reply to a comment
 */
router.post(
  '/:commentId/replies',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { text } = req.body;
      const user = req.user as SessionUser;
      const userId = user?.id;

      // Validation
      if (!text || !text.trim()) {
        return res.status(400).json({
          error: 'Reply text cannot be empty'
        });
      }

      // Check if parent comment exists
      const commentCheck = await pool.query(
        'SELECT id FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Insert reply into database
      const result = await pool.query(
        `INSERT INTO comment_replies (comment_id, user_id, text, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, comment_id, user_id, text, created_at, updated_at`,
        [commentId, userId, text.trim()]
      );

      const reply = result.rows[0];

      // Fetch user info to include in response
      const userResult = await pool.query(
        'SELECT id, username, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const replyWithUser = {
        ...reply,
        user: userResult.rows[0]
      };

      req.logger?.info('Reply created successfully', {
        userId,
        commentId,
        replyId: reply.id,
        operation: 'create_reply'
      });

      res.status(201).json(replyWithUser);
    } catch (error) {
      req.logger?.error('Failed to create reply', error as Error, {
        userId: (req.user as SessionUser)?.id,
        commentId: req.params.commentId,
        operation: 'create_reply'
      });
      res.status(500).json({ error: 'Failed to create reply' });
    }
  }
);

/**
 * PATCH /api/comments/:commentId
 * Update a comment (resolve/unresolve)
 */
router.patch(
  '/:commentId',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { resolved } = req.body;

      // Validation
      if (typeof resolved !== 'boolean') {
        return res.status(400).json({
          error: 'resolved field must be a boolean'
        });
      }

      // Check if comment exists
      const commentCheck = await pool.query(
        'SELECT id FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Update comment
      const result = await pool.query(
        `UPDATE comments
         SET resolved = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, user_id, document_path, repo_owner, repo_name, char_start, char_end, text, resolved, created_at, updated_at`,
        [resolved, commentId]
      );

      const comment = result.rows[0];

      req.logger?.info('Comment updated successfully', {
        userId: (req.user as SessionUser)?.id,
        commentId,
        resolved,
        operation: 'update_comment'
      });

      res.json(comment);
    } catch (error) {
      req.logger?.error('Failed to update comment', error as Error, {
        userId: (req.user as SessionUser)?.id,
        commentId: req.params.commentId,
        operation: 'update_comment'
      });
      res.status(500).json({ error: 'Failed to update comment' });
    }
  }
);

/**
 * DELETE /api/comments/:commentId
 * Delete a comment (only by author)
 */
router.delete(
  '/:commentId',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const user = req.user as SessionUser;
      const userId = user?.id;

      // Check if comment exists and get user_id
      const commentCheck = await pool.query(
        'SELECT id, user_id FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      const comment = commentCheck.rows[0];

      // Verify user is the author
      if (comment.user_id !== userId) {
        return res.status(403).json({
          error: 'You can only delete your own comments'
        });
      }

      // Delete comment (CASCADE will delete associated replies)
      await pool.query(
        'DELETE FROM comments WHERE id = $1',
        [commentId]
      );

      req.logger?.info('Comment deleted successfully', {
        userId,
        commentId,
        operation: 'delete_comment'
      });

      res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      req.logger?.error('Failed to delete comment', error as Error, {
        userId: (req.user as SessionUser)?.id,
        commentId: req.params.commentId,
        operation: 'delete_comment'
      });
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
);

export default router;
