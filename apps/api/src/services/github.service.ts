import { Octokit } from 'octokit';

// Simple logger interface for service layer
export interface Logger {
  info(message: string, properties?: Record<string, unknown>): void;
  warn(message: string, properties?: Record<string, unknown>): void;
  error(message: string, error?: Error, properties?: Record<string, unknown>): void;
  metric(name: string, value: number, properties?: Record<string, unknown>): void;
}

// Cache entry for repository list
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Type definitions for GitHub API responses
interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
  updated_at: string;
}

interface TreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

interface TreeResponse {
  sha: string;
  url: string;
  tree: TreeItem[];
  truncated: boolean;
}

interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: string;
}

// ============================================================================
// E2E Test Mode Mock Data
// ============================================================================

/**
 * Mock repositories for E2E testing
 * These match the test fixtures in tests/e2e/mocks/github-api.mock.ts
 */
const E2E_MOCK_REPOSITORIES: Repository[] = [
  {
    id: 1,
    name: 'test-docs',
    full_name: 'alice-test/test-docs',
    owner: {
      login: 'alice-test',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
    },
    description: 'Test documentation repository',
    private: false,
    permissions: { admin: true, push: true, pull: true },
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'private-notes',
    full_name: 'alice-test/private-notes',
    owner: {
      login: 'alice-test',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
    },
    description: 'Private notes repository',
    private: true,
    permissions: { admin: true, push: true, pull: true },
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    name: 'shared-wiki',
    full_name: 'org-test/shared-wiki',
    owner: {
      login: 'org-test',
      avatar_url: 'https://avatars.githubusercontent.com/u/99999?v=4',
    },
    description: 'Shared organisation wiki',
    private: false,
    permissions: { admin: false, push: true, pull: true },
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

/**
 * Mock file tree for E2E testing
 */
const E2E_MOCK_TREE: TreeResponse = {
  sha: 'main-sha',
  url: 'https://api.github.com/repos/test/tree',
  tree: [
    { path: 'README.md', mode: '100644', type: 'blob', sha: 'abc123', size: 1024 },
    { path: 'docs', mode: '040000', type: 'tree', sha: 'def456' },
    { path: 'docs/getting-started.md', mode: '100644', type: 'blob', sha: 'ghi789', size: 2048 },
    { path: 'docs/api-reference.md', mode: '100644', type: 'blob', sha: 'jkl012', size: 4096 },
    { path: 'docs/examples', mode: '040000', type: 'tree', sha: 'mno345' },
    { path: 'docs/examples/basic.md', mode: '100644', type: 'blob', sha: 'pqr678', size: 512 },
    { path: 'docs/examples/advanced.md', mode: '100644', type: 'blob', sha: 'stu901', size: 1536 },
    { path: 'notes', mode: '040000', type: 'tree', sha: 'vwx234' },
    { path: 'notes/meeting-notes.md', mode: '100644', type: 'blob', sha: 'yza567', size: 768 },
    { path: 'CHANGELOG.md', mode: '100644', type: 'blob', sha: 'bcd890', size: 3072 },
  ],
  truncated: false,
};

/**
 * Mock file contents for E2E testing
 */
const E2E_MOCK_FILES: Record<string, { content: string; sha: string }> = {
  'README.md': {
    content: `# Test Documentation

Welcome to the test documentation repository.

## Getting Started

Check out the [Getting Started Guide](docs/getting-started.md) to begin.

## Features

- Collaborative editing
- Real-time synchronisation
- Comment threads
- GitHub integration
`,
    sha: 'abc123',
  },
  'docs/getting-started.md': {
    content: `# Getting Started

This guide will help you get started with the collaborative markdown editor.

## Prerequisites

- Node.js 18+
- Docker
- GitHub account

## Installation

1. Clone the repository
2. Run \`docker-compose up -d\`
3. Run \`npm install\` in both apps/api and apps/frontend
4. Start the development servers

## Next Steps

Continue to the [API Reference](api-reference.md) for more details.
`,
    sha: 'ghi789',
  },
};

/**
 * Check if running in E2E test mode
 */
function isE2ETestMode(): boolean {
  return process.env.E2E_TEST_MODE === 'true';
}

/**
 * Service for interacting with GitHub API using Octokit
 */
export class GitHubService {
  private repoCache: Map<string, CacheEntry<Repository[]>> = new Map();
  private treeCache: Map<string, CacheEntry<TreeResponse>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private readonly octokitFactory: (token: string) => Octokit;

  constructor(octokitFactory?: (token: string) => Octokit) {
    this.octokitFactory = octokitFactory || ((token: string) => new Octokit({ auth: token }));
  }

  /**
   * Create an authenticated Octokit instance for a user
   */
  private createOctokit(token: string): Octokit {
    return this.octokitFactory(token);
  }

  /**
   * Retry logic with exponential backoff for rate limit errors
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    logger?: Logger,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimitError =
        error instanceof Error &&
        'status' in error &&
        error.status === 403;

      if (isRateLimitError && attempt < this.MAX_RETRIES) {
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        logger?.warn(`Rate limit hit, retrying in ${delay}ms`, {
          attempt,
          maxRetries: this.MAX_RETRIES,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, logger, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * List repositories the user has write access to
   * Filters by affiliation and push permission
   */
  async listUserRepositories(
    token: string,
    logger?: Logger
  ): Promise<Repository[]> {
    // Return mock data in E2E test mode
    if (isE2ETestMode()) {
      logger?.info('E2E test mode: returning mock repositories', {
        operation: 'listUserRepositories',
        count: E2E_MOCK_REPOSITORIES.length,
      });
      return E2E_MOCK_REPOSITORIES;
    }

    const cacheKey = `repos:${token.substring(0, 10)}`;
    const cached = this.repoCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      logger?.info('Returning cached repository list', {
        operation: 'listUserRepositories',
        cached: true,
      });
      return cached.data;
    }

    logger?.info('Fetching repository list from GitHub', {
      operation: 'listUserRepositories',
    });

    const startTime = Date.now();

    try {
      const octokit = this.createOctokit(token);

      // First check what user/orgs we have access to
      try {
        const userInfo = await octokit.rest.users.getAuthenticated();
        console.log('[GITHUB] Authenticated as:', userInfo.data.login);
        
        const orgsResponse = await octokit.rest.orgs.listForAuthenticatedUser();
        console.log('[GITHUB] Organizations accessible:', orgsResponse.data.map(org => org.login));
      } catch (err) {
        console.log('[GITHUB] Error checking user/orgs:', err instanceof Error ? err.message : String(err));
      }

      const repos = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.listForAuthenticatedUser({
          affiliation: 'owner,collaborator,organization_member',
          per_page: 100,
          sort: 'updated',
        });
        return response.data as Repository[];
      }, logger);

      console.log('[GITHUB] Raw API response - total repos:', repos.length);
      if (repos.length > 0) {
        console.log('[GITHUB] First repo sample:', {
          name: repos[0]?.full_name,
          permissions: repos[0]?.permissions,
          private: repos[0]?.private
        });
      }

      logger?.info('GitHub API returned repositories', {
        operation: 'listUserRepositories',
        totalRepos: repos.length,
        sampleRepo: repos.length > 0 ? repos[0]?.full_name : 'none',
        samplePermissions: repos.length > 0 ? repos[0]?.permissions : 'none',
      });

      // Filter to only repos with push permission
      const writableRepos = repos.filter(
        (repo) => repo.permissions?.push === true
      );

      logger?.info('Filtered to writable repositories', {
        operation: 'listUserRepositories',
        totalRepos: repos.length,
        writableRepos: writableRepos.length,
        filtered: repos.length - writableRepos.length,
      });

      // Cache the result
      this.repoCache.set(cacheKey, {
        data: writableRepos,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      const duration = Date.now() - startTime;
      logger?.metric('github_api_duration_ms', duration, {
        operation: 'listUserRepositories',
        repoCount: writableRepos.length,
      });

      logger?.info('Successfully fetched repository list', {
        operation: 'listUserRepositories',
        count: writableRepos.length,
      });

      return writableRepos;
    } catch (error) {
      logger?.error(
        'Failed to list user repositories',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'listUserRepositories' }
      );
      throw error;
    }
  }

  /**
   * Get repository tree recursively
   * Returns complete file tree structure
   */
  async getRepositoryTree(
    owner: string,
    repo: string,
    token: string,
    logger?: Logger
  ): Promise<TreeResponse> {
    // Return mock data in E2E test mode
    if (isE2ETestMode()) {
      logger?.info('E2E test mode: returning mock tree', {
        operation: 'getRepositoryTree',
        owner,
        repo,
        itemCount: E2E_MOCK_TREE.tree.length,
      });
      return E2E_MOCK_TREE;
    }

    const cacheKey = `tree:${owner}/${repo}`;
    const cached = this.treeCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      logger?.info('Returning cached repository tree', {
        operation: 'getRepositoryTree',
        owner,
        repo,
        cached: true,
      });
      return cached.data;
    }

    logger?.info('Fetching repository tree from GitHub', {
      operation: 'getRepositoryTree',
      owner,
      repo,
    });

    const startTime = Date.now();

    try {
      const octokit = this.createOctokit(token);

      // First, get the default branch
      const repoData = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.get({ owner, repo });
        return response.data;
      }, logger);

      const defaultBranch = repoData.default_branch;

      // Get the tree recursively
      const tree = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha: defaultBranch,
          recursive: 'true',
        });
        return response.data as TreeResponse;
      }, logger);

      // Cache the result
      this.treeCache.set(cacheKey, {
        data: tree,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      const duration = Date.now() - startTime;
      logger?.metric('github_api_duration_ms', duration, {
        operation: 'getRepositoryTree',
        owner,
        repo,
        itemCount: tree.tree.length,
      });

      logger?.info('Successfully fetched repository tree', {
        operation: 'getRepositoryTree',
        owner,
        repo,
        itemCount: tree.tree.length,
      });

      return tree;
    } catch (error) {
      logger?.error(
        'Failed to get repository tree',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getRepositoryTree', owner, repo }
      );
      throw error;
    }
  }

  /**
   * Get file content from repository
   * Decodes Base64 content automatically
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    token: string,
    logger?: Logger
  ): Promise<{ content: string; sha: string }> {
    // Return mock data in E2E test mode
    if (isE2ETestMode()) {
      const mockFile = E2E_MOCK_FILES[path];
      if (mockFile) {
        logger?.info('E2E test mode: returning mock file content', {
          operation: 'getFileContent',
          owner,
          repo,
          path,
        });
        return mockFile;
      }
      // If file not in mock data, throw 404-like error
      const error = new Error('File not found') as Error & { status: number };
      error.status = 404;
      throw error;
    }

    logger?.info('Fetching file content from GitHub', {
      operation: 'getFileContent',
      owner,
      repo,
      path,
    });

    const startTime = Date.now();

    try {
      const octokit = this.createOctokit(token);

      const file = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        });
        return response.data as FileContent;
      }, logger);

      // Decode Base64 content
      const content = Buffer.from(file.content, 'base64').toString('utf-8');

      const duration = Date.now() - startTime;
      logger?.metric('github_api_duration_ms', duration, {
        operation: 'getFileContent',
        owner,
        repo,
        path,
        size: file.size,
      });

      logger?.info('Successfully fetched file content', {
        operation: 'getFileContent',
        owner,
        repo,
        path,
        sha: file.sha,
      });

      return { content, sha: file.sha };
    } catch (error) {
      logger?.error(
        'Failed to get file content',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getFileContent', owner, repo, path }
      );
      throw error;
    }
  }

  /**
   * Update file in repository
   * Handles conflicts by throwing error with 409 status
   */
  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string,
    message: string,
    token: string,
    logger?: Logger
  ): Promise<{ sha: string; commit: string }> {
    // Return mock success in E2E test mode
    if (isE2ETestMode()) {
      const newSha = `sha-${Date.now()}`;
      logger?.info('E2E test mode: simulating file update', {
        operation: 'updateFile',
        owner,
        repo,
        path,
        newSha,
      });
      return { sha: newSha, commit: `commit-${Date.now()}` };
    }

    logger?.info('Updating file in GitHub', {
      operation: 'updateFile',
      owner,
      repo,
      path,
    });

    const startTime = Date.now();

    try {
      const octokit = this.createOctokit(token);

      const result = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          sha,
        });
        return response.data;
      }, logger);

      const duration = Date.now() - startTime;
      logger?.metric('github_api_duration_ms', duration, {
        operation: 'updateFile',
        owner,
        repo,
        path,
      });

      logger?.info('Successfully updated file', {
        operation: 'updateFile',
        owner,
        repo,
        path,
        newSha: result.content?.sha,
        commitSha: result.commit.sha,
      });

      return {
        sha: result.content?.sha || '',
        commit: result.commit.sha || '',
      };
    } catch (error) {
      logger?.error(
        'Failed to update file',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'updateFile', owner, repo, path }
      );
      throw error;
    }
  }

  /**
   * Create new file in repository
   * Throws error if file already exists (409)
   */
  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    token: string,
    logger?: Logger
  ): Promise<{ sha: string; commit: string }> {
    // Return mock success in E2E test mode
    if (isE2ETestMode()) {
      // Check if file already exists in mock data
      if (E2E_MOCK_FILES[path]) {
        const error = new Error('File already exists') as Error & { status: number };
        error.status = 409;
        throw error;
      }
      const newSha = `sha-${Date.now()}`;
      logger?.info('E2E test mode: simulating file creation', {
        operation: 'createFile',
        owner,
        repo,
        path,
        newSha,
      });
      return { sha: newSha, commit: `commit-${Date.now()}` };
    }

    logger?.info('Creating file in GitHub', {
      operation: 'createFile',
      owner,
      repo,
      path,
    });

    const startTime = Date.now();

    try {
      const octokit = this.createOctokit(token);

      const result = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
        });
        return response.data;
      }, logger);

      const duration = Date.now() - startTime;
      logger?.metric('github_api_duration_ms', duration, {
        operation: 'createFile',
        owner,
        repo,
        path,
      });

      logger?.info('Successfully created file', {
        operation: 'createFile',
        owner,
        repo,
        path,
        sha: result.content?.sha,
        commitSha: result.commit.sha,
      });

      return {
        sha: result.content?.sha || '',
        commit: result.commit.sha || '',
      };
    } catch (error) {
      logger?.error(
        'Failed to create file',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'createFile', owner, repo, path }
      );
      throw error;
    }
  }

  /**
   * Filter tree to show only .md files and folders containing .md files
   * Returns filtered tree with metadata for each file
   */
  filterMarkdownTree(tree: TreeResponse): TreeItem[] {
    // First, identify all .md files
    const mdFiles = tree.tree.filter(
      (item) => item.type === 'blob' && item.path?.endsWith('.md')
    );

    // Extract unique folder paths that contain .md files
    const foldersWithMd = new Set<string>();
    mdFiles.forEach((file) => {
      if (file.path) {
        const pathParts = file.path.split('/');
        // Add all parent folders
        for (let i = 1; i < pathParts.length; i++) {
          foldersWithMd.add(pathParts.slice(0, i).join('/'));
        }
      }
    });

    // Filter tree to include only .md files and their parent folders
    const filteredTree = tree.tree.filter((item) => {
      if (item.type === 'blob' && item.path?.endsWith('.md')) {
        return true;
      }
      if (item.type === 'tree' && item.path && foldersWithMd.has(item.path)) {
        return true;
      }
      return false;
    });

    return filteredTree;
  }

  /**
   * Clear cache entry for a specific token
   */
  clearCache(token: string): void {
    const cacheKey = `repos:${token.substring(0, 10)}`;
    this.repoCache.delete(cacheKey);
  }

  /**
   * Clear tree cache for a specific repository
   */
  clearTreeCache(owner: string, repo: string): void {
    const cacheKey = `tree:${owner}/${repo}`;
    this.treeCache.delete(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.repoCache.clear();
    this.treeCache.clear();
  }

  /**
   * Get comment file for a document
   * Comments are stored in .mume folder at repo root, preserving path structure.
   * Example: "docs/guide.md" → ".mume/docs/guide.md"
   * Returns null if the comment file doesn't exist (404)
   */
  async getCommentFile(
    owner: string,
    repo: string,
    documentPath: string,
    token: string,
    logger?: Logger
  ): Promise<{ content: string; sha: string } | null> {
    // Comment files are stored in .mume folder with same path structure
    const commentFilePath = `.mume/${documentPath}`;

    logger?.info('Fetching comment file from GitHub', {
      operation: 'getCommentFile',
      owner,
      repo,
      documentPath,
      commentFilePath,
    });

    try {
      return await this.getFileContent(owner, repo, commentFilePath, token, logger);
    } catch (error: any) {
      // Return null if file doesn't exist (404)
      if (error?.status === 404) {
        logger?.info('Comment file does not exist', {
          operation: 'getCommentFile',
          owner,
          repo,
          commentFilePath,
        });
        return null;
      }
      throw error;
    }
  }

  /**
   * Save comment file for a document
   * Comments are stored in .mume folder at repo root, preserving path structure.
   * Example: "docs/guide.md" → ".mume/docs/guide.md"
   * Creates the file if it doesn't exist, updates if it does
   */
  async saveCommentFile(
    owner: string,
    repo: string,
    documentPath: string,
    content: string,
    sha: string | null,
    message: string,
    token: string,
    logger?: Logger
  ): Promise<{ sha: string; commit: string }> {
    // Comment files are stored in .mume folder with same path structure
    const commentFilePath = `.mume/${documentPath}`;

    logger?.info('Saving comment file to GitHub', {
      operation: 'saveCommentFile',
      owner,
      repo,
      documentPath,
      commentFilePath,
      hasSha: !!sha,
    });

    if (sha) {
      // Update existing file
      return await this.updateFile(owner, repo, commentFilePath, content, sha, message, token, logger);
    } else {
      // Create new file
      return await this.createFile(owner, repo, commentFilePath, content, message, token, logger);
    }
  }
}
