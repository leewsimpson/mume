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

/**
 * Service for interacting with GitHub API using Octokit
 */
export class GitHubService {
  private repoCache: Map<string, CacheEntry<Repository[]>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second

  /**
   * Create an authenticated Octokit instance for a user
   */
  private createOctokit(token: string): Octokit {
    return new Octokit({ auth: token });
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

      const repos = await this.retryWithBackoff(async () => {
        const response = await octokit.rest.repos.listForAuthenticatedUser({
          affiliation: 'owner,collaborator,organization_member',
          per_page: 100,
          sort: 'updated',
        });
        return response.data as Repository[];
      }, logger);

      // Filter to only repos with push permission
      const writableRepos = repos.filter(
        (repo) => repo.permissions?.push === true
      );

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
   * Clear cache entry for a specific token
   */
  clearCache(token: string): void {
    const cacheKey = `repos:${token.substring(0, 10)}`;
    this.repoCache.delete(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.repoCache.clear();
  }
}
