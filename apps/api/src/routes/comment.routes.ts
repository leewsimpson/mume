import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateGitHubToken } from '../middleware/validateGitHubToken.js';
import { GitHubService } from '../services/github.service.js';
import { CommentFileService } from '../services/comment-file.service.js';
import type { SessionUser } from '../config/passport.js';

const router = Router();
const githubService = new GitHubService();
const commentFileService = new CommentFileService();

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
      const githubToken = res.locals.githubToken;

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

      // Fetch or create comment file
      const existingFile = await githubService.getCommentFile(
        repoOwner,
        repoName,
        documentPath,
        githubToken,
        req.logger
      );

      let commentData = existingFile
        ? commentFileService.parseCommentFile(existingFile.content, req.logger)
        : commentFileService.createEmptyCommentFile(documentPath);

      // Add comment
      const { data: updatedData, commentId } = commentFileService.addComment(commentData, {
        charStart,
        charEnd,
        author: {
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        text: text.trim(),
        resolved: false,
      });

      // Serialize and save
      const fileContent = commentFileService.serializeCommentFile(updatedData);
      await githubService.saveCommentFile(
        repoOwner,
        repoName,
        documentPath,
        fileContent,
        existingFile?.sha || null,
        `Add comment on ${documentPath}`,
        githubToken,
        req.logger
      );

      const newComment = commentFileService.getComment(updatedData, commentId);

      req.logger?.info('Comment created successfully', {
        userId,
        commentId,
        repoOwner,
        repoName,
        documentPath,
        operation: 'create_comment'
      });

      // Return in API format for backward compatibility
      const apiComment = commentFileService.convertToApiFormat(newComment!, userId);
      apiComment.documentPath = documentPath;
      apiComment.repoOwner = repoOwner;
      apiComment.repoName = repoName;

      res.status(201).json(apiComment);
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
 * POST /api/comments/:commentId/replies
 * Create a reply to a comment
 */
router.post(
  '/:commentId/replies',
  authenticate,
  validateGitHubToken,
  async (req: Request, res: Response) => {
    try {
      const commentId = req.params.commentId!;
      const { text, documentPath, repoOwner, repoName } = req.body;
      const user = req.user as SessionUser;
      const userId = user?.id;
      const githubToken = res.locals.githubToken;

      // Validation
      if (!text || !text.trim()) {
        return res.status(400).json({
          error: 'Reply text cannot be empty'
        });
      }

      if (!documentPath || !repoOwner || !repoName) {
        return res.status(400).json({
          error: 'Missing required fields: documentPath, repoOwner, repoName'
        });
      }

      // TypeScript: These are validated above
      const validatedDocPath = documentPath as string;
      const validatedRepoOwner = repoOwner as string;
      const validatedRepoName = repoName as string;

      // Fetch comment file
      const existingFile = await githubService.getCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        githubToken,
        req.logger
      );

      if (!existingFile) {
        return res.status(404).json({
          error: 'Comment file not found'
        });
      }

      const commentData = commentFileService.parseCommentFile(existingFile.content, req.logger);

      // Check if comment exists
      const comment = commentFileService.getComment(commentData, commentId);
      if (!comment) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Add reply
      const { data: updatedData, replyId } = commentFileService.addReply(commentData, commentId, {
        author: {
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        text: text.trim(),
      });

      // Serialize and save
      const fileContent = commentFileService.serializeCommentFile(updatedData);
      await githubService.saveCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        fileContent,
        existingFile.sha,
        `Add reply to comment on ${validatedDocPath}`,
        githubToken,
        req.logger
      );

      const updatedComment = commentFileService.getComment(updatedData, commentId);
      const reply = updatedComment!.replies.find((r) => r.id === replyId);

      req.logger?.info('Reply created successfully', {
        userId,
        commentId,
        replyId,
        operation: 'create_reply'
      });

      // Return in API format
      res.status(201).json({
        id: reply!.id,
        commentId,
        userId,
        text: reply!.text,
        createdAt: reply!.createdAt,
        updatedAt: reply!.createdAt,
        user: {
          id: userId,
          username: reply!.author.username,
          avatarUrl: reply!.author.avatarUrl,
        },
      });
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
      const commentId = req.params.commentId!;
      const { resolved, documentPath, repoOwner, repoName } = req.body;
      const githubToken = res.locals.githubToken;

      // Validation
      if (typeof resolved !== 'boolean') {
        return res.status(400).json({
          error: 'resolved field must be a boolean'
        });
      }

      if (!documentPath || !repoOwner || !repoName) {
        return res.status(400).json({
          error: 'Missing required fields: documentPath, repoOwner, repoName'
        });
      }

      // TypeScript: These are validated above
      const validatedDocPath = documentPath as string;
      const validatedRepoOwner = repoOwner as string;
      const validatedRepoName = repoName as string;

      // Fetch comment file
      const existingFile = await githubService.getCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        githubToken,
        req.logger
      );

      if (!existingFile) {
        return res.status(404).json({
          error: 'Comment file not found'
        });
      }

      const commentData = commentFileService.parseCommentFile(existingFile.content, req.logger);

      // Check if comment exists
      const comment = commentFileService.getComment(commentData, commentId);
      if (!comment) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Update resolved status
      const updatedData = commentFileService.updateCommentResolved(commentData, commentId, resolved);

      // Serialize and save
      const fileContent = commentFileService.serializeCommentFile(updatedData);
      await githubService.saveCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        fileContent,
        existingFile.sha,
        resolved ? `Resolve comment on ${validatedDocPath}` : `Unresolve comment on ${validatedDocPath}`,
        githubToken,
        req.logger
      );

      const updatedComment = commentFileService.getComment(updatedData, commentId);

      req.logger?.info('Comment updated successfully', {
        userId: (req.user as SessionUser)?.id,
        commentId,
        resolved,
        operation: 'update_comment'
      });

      // Return in API format
      const apiComment = commentFileService.convertToApiFormat(updatedComment!, (req.user as SessionUser).id);
      apiComment.documentPath = validatedDocPath;
      apiComment.repoOwner = validatedRepoOwner;
      apiComment.repoName = validatedRepoName;

      res.json(apiComment);
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
      const commentId = req.params.commentId!;
      const { documentPath, repoOwner, repoName } = req.query;
      const user = req.user as SessionUser;
      const userId = user?.id;
      const githubToken = res.locals.githubToken;

      if (!documentPath || !repoOwner || !repoName) {
        return res.status(400).json({
          error: 'Missing required query parameters: documentPath, repoOwner, repoName'
        });
      }

      // TypeScript: These are validated above
      const validatedDocPath = documentPath as string;
      const validatedRepoOwner = repoOwner as string;
      const validatedRepoName = repoName as string;

      // Fetch comment file
      const existingFile = await githubService.getCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        githubToken,
        req.logger
      );

      if (!existingFile) {
        return res.status(404).json({
          error: 'Comment file not found'
        });
      }

      const commentData = commentFileService.parseCommentFile(existingFile.content, req.logger);

      // Check if comment exists
      const comment = commentFileService.getComment(commentData, commentId);
      if (!comment) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Verify user is the author
      if (comment.author.username !== user.username) {
        return res.status(403).json({
          error: 'You can only delete your own comments'
        });
      }

      // Delete comment
      const updatedData = commentFileService.deleteComment(commentData, commentId);

      // Serialize and save
      const fileContent = commentFileService.serializeCommentFile(updatedData);
      await githubService.saveCommentFile(
        validatedRepoOwner,
        validatedRepoName,
        validatedDocPath,
        fileContent,
        existingFile.sha,
        `Delete comment on ${validatedDocPath}`,
        githubToken,
        req.logger
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
