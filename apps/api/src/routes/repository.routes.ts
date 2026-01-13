import { Router } from 'express';
import { GitHubService } from '../services/github.service.js';
import { documentStateService } from '../services/documentState.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateGitHubToken } from '../middleware/validateGitHubToken.js';
import type { SessionUser } from '../config/passport.js';
import pool from '../db/connection.js';

const router = Router();
const githubService = new GitHubService();

// Apply authentication middleware to all repository routes
router.use(authenticate);
router.use(validateGitHubToken);

/**
 * GET /api/repositories
 * List all repositories the user has write access to
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user as SessionUser;
    const token = res.locals.githubToken as string;

    console.log('[REPO] Fetching repositories for user:', user.username, 'token exists:', !!token);

    req.logger?.info('Fetching user repositories', {
      userId: user.id,
      operation: 'listRepositories',
    });

    const repositories = await githubService.listUserRepositories(token, req.logger);
    
    console.log('[REPO] GitHub API returned', repositories.length, 'repositories');

    req.logger?.info('Successfully fetched repositories', {
      userId: user.id,
      count: repositories.length,
      operation: 'listRepositories',
    });

    res.json(repositories);
  } catch (error) {
    req.logger?.error(
      'Failed to fetch repositories',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        operation: 'listRepositories',
      }
    );

    // Handle specific GitHub API errors
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401) {
        return res.status(401).json({ error: 'GitHub token is invalid or expired' });
      }
      if (status === 403) {
        return res.status(403).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
    }

    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

/**
 * POST /api/repositories/select
 * Store selected repository in session
 */
router.post('/select', (req, res) => {
  try {
    const { owner, name, fullName } = req.body;

    if (!owner || !name || !fullName) {
      return res.status(400).json({ error: 'Missing required fields: owner, name, fullName' });
    }

    const user = req.user as SessionUser;

    req.logger?.info('Storing selected repository in session', {
      userId: user.id,
      owner,
      name,
      operation: 'selectRepository',
    });

    // Store in session
    req.session.selectedRepo = {
      owner,
      name,
      fullName,
    };

    req.session.save((err) => {
      if (err) {
        req.logger?.error('Failed to save session', err, {
          userId: user.id,
          operation: 'selectRepository',
        });
        return res.status(500).json({ error: 'Failed to save selected repository' });
      }

      req.logger?.info('Successfully stored selected repository', {
        userId: user.id,
        owner,
        name,
        operation: 'selectRepository',
      });

      res.json({ success: true });
    });
  } catch (error) {
    req.logger?.error(
      'Failed to select repository',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        operation: 'selectRepository',
      }
    );

    res.status(500).json({ error: 'Failed to select repository' });
  }
});

/**
 * GET /api/repositories/selected
 * Get currently selected repository from session
 */
router.get('/selected', (req, res) => {
  try {
    const user = req.user as SessionUser;
    const selectedRepo = req.session.selectedRepo;

    if (!selectedRepo) {
      return res.status(404).json({ error: 'No repository selected' });
    }

    req.logger?.info('Retrieved selected repository', {
      userId: user.id,
      owner: selectedRepo.owner,
      name: selectedRepo.name,
      operation: 'getSelectedRepository',
    });

    res.json(selectedRepo);
  } catch (error) {
    req.logger?.error(
      'Failed to get selected repository',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        operation: 'getSelectedRepository',
      }
    );

    res.status(500).json({ error: 'Failed to get selected repository' });
  }
});

/**
 * GET /api/repositories/:owner/:repo/tree
 * Get repository file tree filtered to show only .md files and their folders
 */
router.get('/:owner/:repo/tree', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const user = req.user as SessionUser;
    const token = res.locals.githubToken as string;

    req.logger?.info('Fetching repository tree', {
      userId: user.id,
      owner,
      repo,
      operation: 'getRepositoryTree',
    });

    const tree = await githubService.getRepositoryTree(owner, repo, token, req.logger);
    const filteredTree = githubService.filterMarkdownTree(tree);

    req.logger?.info('Successfully fetched and filtered repository tree', {
      userId: user.id,
      owner,
      repo,
      totalItems: tree.tree.length,
      filteredItems: filteredTree.length,
      operation: 'getRepositoryTree',
    });

    res.json({
      sha: tree.sha,
      url: tree.url,
      tree: filteredTree,
      truncated: tree.truncated,
    });
  } catch (error) {
    req.logger?.error(
      'Failed to fetch repository tree',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        owner: req.params.owner,
        repo: req.params.repo,
        operation: 'getRepositoryTree',
      }
    );

    // Handle specific GitHub API errors
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      if (status === 401) {
        return res.status(401).json({ error: 'GitHub token is invalid or expired' });
      }
      if (status === 403) {
        return res.status(403).json({ error: 'Rate limit exceeded or insufficient permissions' });
      }
    }

    res.status(500).json({ error: 'Failed to fetch repository tree' });
  }
});

/**
 * POST /api/repositories/:owner/:repo/documents/register
 * Register a document for automatic GitHub syncing
 * Called when a user opens a document in the editor
 */
router.post('/:owner/:repo/documents/register', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { filePath, sha, documentId, userName } = req.body;
    const user = req.user as SessionUser;
    const token = res.locals.githubToken as string;

    if (!filePath || !sha || !documentId) {
      return res.status(400).json({ error: 'Missing required fields: filePath, sha, documentId' });
    }

    req.logger?.info('Registering document for GitHub sync', {
      userId: user.id,
      owner,
      repo,
      filePath,
      documentId,
      userName,
      operation: 'registerDocument',
    });

    // Register document metadata with the document state service
    documentStateService.registerDocument(
      documentId,
      owner,
      repo,
      filePath,
      sha,
      token
    );

    // Add user as an editor
    if (userName) {
      documentStateService.addEditor(documentId, userName);
    }

    req.logger?.info('Successfully registered document', {
      userId: user.id,
      documentId,
      operation: 'registerDocument',
    });

    res.json({ success: true, message: 'Document registered for sync' });
  } catch (error) {
    req.logger?.error(
      'Failed to register document',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        owner: req.params.owner,
        repo: req.params.repo,
        operation: 'registerDocument',
      }
    );

    res.status(500).json({ error: 'Failed to register document' });
  }
});

/**
 * POST /api/repositories/:owner/:repo/documents/:documentId/save
 * Manually trigger an immediate save to GitHub
 */
router.post('/:owner/:repo/documents/:documentId/save', async (req, res) => {
  try {
    const { owner, repo, documentId } = req.params;
    const user = req.user as SessionUser;

    console.log('[SAVE] Manual save triggered:', { owner, repo, documentId, userId: user.id });

    req.logger?.info('Manual save triggered', {
      userId: user.id,
      owner,
      repo,
      documentId,
      operation: 'manualSave',
    });

    // Import the save function dynamically to avoid circular dependencies
    const { saveDocumentWithRetry } = await import('../jobs/githubSync.job.js');

    console.log('[SAVE] Calling saveDocumentWithRetry for:', documentId);

    // Trigger immediate save
    const success = await saveDocumentWithRetry(documentId, req.logger);
    
    console.log('[SAVE] Save result:', success);

    if (success) {
      req.logger?.info('Manual save succeeded', {
        userId: user.id,
        documentId,
        operation: 'manualSave',
      });

      // Get updated metadata to return to client
      const metadata = documentStateService.getDocument(documentId);

      res.json({
        success: true,
        message: 'Changes saved to GitHub',
        sha: metadata?.sha,
        lastSaved: metadata?.lastSaved,
      });
    } else {
      console.log('[SAVE] Save failed - returning 500');
      req.logger?.warn('Manual save failed', {
        userId: user.id,
        documentId,
        operation: 'manualSave',
      });

      res.status(500).json({
        success: false,
        error: 'Document not ready for saving. Please wait a moment and try again.',
      });
    }
  } catch (error) {
    console.error('[SAVE ERROR]', error);
    req.logger?.error(
      'Manual save error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        owner: req.params.owner,
        repo: req.params.repo,
        documentId: req.params.documentId,
        operation: 'manualSave',
      }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to save changes to GitHub',
    });
  }
});

/**
 * GET /api/repositories/:owner/:repo/comments
 * Get all comments for a specific document
 * Query parameter: filePath (e.g., README.md or docs/guide.md)
 */
router.get('/:owner/:repo/comments', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.query.filePath as string;

    req.logger?.info('Fetching comments', {
      owner,
      repo,
      filePath,
      query: req.query,
      operation: 'fetch_comments_request'
    });

    if (!filePath) {
      return res.status(400).json({ error: 'File path query parameter is required' });
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
    const commentIds = result.rows.map((row: { id: number }) => row.id);
    const repliesMap = new Map<number, Array<{
      id: number;
      commentId: number;
      userId: number;
      text: string;
      createdAt: Date;
      updatedAt: Date;
      user: { id: number; username: string; avatarUrl: string };
    }>>();

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

    const comments = result.rows.map((row: {
      id: number;
      user_id: number;
      document_path: string;
      repo_owner: string;
      repo_name: string;
      char_start: number;
      char_end: number;
      text: string;
      resolved: boolean;
      created_at: Date;
      updated_at: Date;
      username: string;
      avatar_url: string;
    }) => ({
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
});

/**
 * GET /api/repositories/:owner/:repo/files/*
 * Fetch file content and SHA from GitHub
 * Path parameter should be the full file path (e.g., docs/README.md)
 */
router.get('/:owner/:repo/files/*', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    // Extract file path from wildcard param (everything after /files/)
    const filePath = (req.params as Record<string, string>)['0'];
    const user = req.user as SessionUser;
    const token = res.locals.githubToken as string;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    req.logger?.info('Fetching file content', {
      userId: user.id,
      owner,
      repo,
      path: filePath,
      operation: 'getFileContent',
    });

    const fileData = await githubService.getFileContent(owner, repo, filePath, token, req.logger);

    req.logger?.info('Successfully fetched file content', {
      userId: user.id,
      owner,
      repo,
      path: filePath,
      contentLength: fileData.content.length,
      operation: 'getFileContent',
    });

    res.json({
      content: fileData.content,
      sha: fileData.sha,
      path: filePath,
    });
  } catch (error) {
    req.logger?.error(
      'Failed to fetch file content',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        owner: req.params.owner,
        repo: req.params.repo,
        path: (req.params as Record<string, string>)['0'],
        operation: 'getFileContent',
      }
    );

    // Handle specific GitHub API errors
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (status === 401) {
        return res.status(401).json({ error: 'GitHub token is invalid or expired' });
      }
      if (status === 403) {
        return res.status(403).json({ error: 'Rate limit exceeded or insufficient permissions' });
      }
    }

    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

/**
 * POST /api/repositories/:owner/:repo/files
 * Create a new markdown file in the repository
 */
router.post('/:owner/:repo/files', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path, content, message } = req.body;
    const user = req.user as SessionUser;
    const token = res.locals.githubToken as string;

    // Validate request body
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: path' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: message' });
    }
    if (content !== undefined && typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid field: content must be a string' });
    }

    // Validate file path ends with .md
    if (!path.endsWith('.md')) {
      return res.status(400).json({ error: 'File path must end with .md' });
    }

    // Validate file path doesn't contain invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      return res.status(400).json({ error: 'File path contains invalid characters' });
    }

    req.logger?.info('Creating new markdown file', {
      userId: user.id,
      owner,
      repo,
      path,
      operation: 'createFile',
    });

    // Use provided content or default to empty document with heading
    const fileContent = content !== undefined ? content : '# New Document\n';

    const result = await githubService.createFile(
      owner,
      repo,
      path,
      fileContent,
      message,
      token,
      req.logger
    );

    // Invalidate tree cache after file creation
    githubService.clearTreeCache(owner, repo);

    req.logger?.info('Successfully created markdown file', {
      userId: user.id,
      owner,
      repo,
      path,
      sha: result.sha,
      commitSha: result.commit,
      operation: 'createFile',
    });

    res.status(201).json({
      success: true,
      sha: result.sha,
      commit: result.commit,
      path,
    });
  } catch (error) {
    req.logger?.error(
      'Failed to create file',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: (req.user as SessionUser)?.id,
        owner: req.params.owner,
        repo: req.params.repo,
        path: req.body.path,
        operation: 'createFile',
      }
    );

    // Handle specific GitHub API errors
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      if (status === 409) {
        return res.status(409).json({ error: 'File already exists' });
      }
      if (status === 422) {
        return res.status(422).json({ error: 'Invalid file path or content' });
      }
      if (status === 401) {
        return res.status(401).json({ error: 'GitHub token is invalid or expired' });
      }
      if (status === 403) {
        return res.status(403).json({ error: 'Rate limit exceeded or insufficient permissions' });
      }
    }

    res.status(500).json({ error: 'Failed to create file' });
  }
});

export default router;
