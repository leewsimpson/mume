import { Router } from 'express';
import { GitHubService } from '../services/github.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateGitHubToken } from '../middleware/validateGitHubToken.js';
import type { SessionUser } from '../config/passport.js';

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

    req.logger?.info('Fetching user repositories', {
      userId: user.id,
      operation: 'listRepositories',
    });

    const repositories = await githubService.listUserRepositories(token, req.logger);

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
