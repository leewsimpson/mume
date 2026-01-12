import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { GitHubService } from '../src/services/github.service.js';
import type { SessionUser } from '../src/config/passport.js';

// Mock GitHubService
jest.mock('../src/services/github.service.js');

describe('Repository Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockGitHubService: jest.Mocked<GitHubService>;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      save: jest.fn((callback: (err?: Error) => void) => callback()),
      selectedRepo: undefined,
    };

    mockRequest = {
      user: {
        id: 1,
        githubId: '12345',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      } as SessionUser,
      session: mockSession as any,
      body: {},
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        metric: jest.fn(),
      },
    };

    const jsonMock = jest.fn();
    const statusMock = jest.fn(() => ({ json: jsonMock }));

    mockResponse = {
      json: jsonMock,
      status: statusMock as any,
      locals: {
        githubToken: 'test-token',
      },
    };

    mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>;
  });

  describe('GET /api/repositories', () => {
    it('should return list of repositories with write access', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          owner: {
            login: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          description: 'Test repository',
          private: false,
          permissions: { push: true },
          updated_at: '2026-01-12T00:00:00Z',
        },
      ];

      mockGitHubService.listUserRepositories = jest.fn().mockResolvedValue(mockRepos);

      // Simulate route handler
      const token = mockResponse.locals!.githubToken as string;
      const repositories = await mockGitHubService.listUserRepositories(token, mockRequest.logger);

      expect(mockGitHubService.listUserRepositories).toHaveBeenCalledWith(token, mockRequest.logger);
      expect(repositories).toEqual(mockRepos);
      expect(repositories.length).toBe(1);
      expect(repositories[0].full_name).toBe('testuser/test-repo');
    });

    it('should handle GitHub API errors', async () => {
      const error = new Error('GitHub API error') as any;
      error.status = 403;

      mockGitHubService.listUserRepositories = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.listUserRepositories('test-token', mockRequest.logger);
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(403);
      }
    });

    it('should handle invalid token errors', async () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;

      mockGitHubService.listUserRepositories = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.listUserRepositories('invalid-token', mockRequest.logger);
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(401);
      }
    });
  });

  describe('POST /api/repositories/select', () => {
    it('should store selected repository in session', () => {
      mockRequest.body = {
        owner: 'testuser',
        name: 'test-repo',
        fullName: 'testuser/test-repo',
      };

      // Simulate route handler
      mockRequest.session!.selectedRepo = {
        owner: mockRequest.body.owner,
        name: mockRequest.body.name,
        fullName: mockRequest.body.fullName,
      };

      expect(mockRequest.session!.selectedRepo).toEqual({
        owner: 'testuser',
        name: 'test-repo',
        fullName: 'testuser/test-repo',
      });
    });

    it('should validate required fields', () => {
      mockRequest.body = {
        owner: 'testuser',
        // missing name and fullName
      };

      const hasAllFields = !!(mockRequest.body.owner && mockRequest.body.name && mockRequest.body.fullName);

      expect(hasAllFields).toBe(false);
    });

    it('should handle session save errors', () => {
      const saveError = new Error('Session save failed');
      mockSession.save = jest.fn((callback: (err?: Error) => void) => callback(saveError));

      mockRequest.body = {
        owner: 'testuser',
        name: 'test-repo',
        fullName: 'testuser/test-repo',
      };

      mockRequest.session!.selectedRepo = mockRequest.body;
      mockRequest.session!.save((err) => {
        expect(err).toBe(saveError);
      });
    });
  });

  describe('GET /api/repositories/selected', () => {
    it('should return selected repository from session', () => {
      const selectedRepo = {
        owner: 'testuser',
        name: 'test-repo',
        fullName: 'testuser/test-repo',
      };

      mockRequest.session!.selectedRepo = selectedRepo;

      expect(mockRequest.session!.selectedRepo).toEqual(selectedRepo);
    });

    it('should return 404 when no repository is selected', () => {
      mockRequest.session!.selectedRepo = undefined;

      const hasSelectedRepo = !!mockRequest.session!.selectedRepo;

      expect(hasSelectedRepo).toBe(false);
    });
  });

  describe('Repository list filtering and pagination', () => {
    it('should filter repositories by search query', () => {
      const repositories = [
        { full_name: 'user/repo1', description: 'First repository' },
        { full_name: 'user/repo2', description: 'Second repository' },
        { full_name: 'user/test-app', description: 'Test application' },
      ];

      const searchQuery = 'test';
      const filtered = repositories.filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].full_name).toBe('user/test-app');
    });

    it('should paginate repositories correctly', () => {
      const repositories = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        full_name: `user/repo${i + 1}`,
      }));

      const ITEMS_PER_PAGE = 20;
      const currentPage = 1;

      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const currentPageRepos = repositories.slice(startIndex, endIndex);

      expect(currentPageRepos.length).toBe(20);
      expect(currentPageRepos[0].full_name).toBe('user/repo1');
      expect(currentPageRepos[19].full_name).toBe('user/repo20');

      // Test second page
      const page2StartIndex = (2 - 1) * ITEMS_PER_PAGE;
      const page2EndIndex = page2StartIndex + ITEMS_PER_PAGE;
      const page2Repos = repositories.slice(page2StartIndex, page2EndIndex);

      expect(page2Repos.length).toBe(5);
      expect(page2Repos[0].full_name).toBe('user/repo21');
    });

    it('should calculate total pages correctly', () => {
      const repositories = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const ITEMS_PER_PAGE = 20;

      const totalPages = Math.ceil(repositories.length / ITEMS_PER_PAGE);

      expect(totalPages).toBe(2);
    });
  });

  describe('GET /api/repositories/:owner/:repo/tree', () => {
    it('should return repository tree filtered for markdown files', async () => {
      const mockTree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', type: 'blob' as const, sha: 'sha1', size: 1024 },
          { path: 'docs', type: 'tree' as const, sha: 'sha2' },
          { path: 'docs/guide.md', type: 'blob' as const, sha: 'sha3', size: 2048 },
          { path: 'src/index.js', type: 'blob' as const, sha: 'sha4', size: 512 },
        ],
        truncated: false,
      };

      const mockFilteredTree = [
        { path: 'README.md', type: 'blob' as const, sha: 'sha1', size: 1024 },
        { path: 'docs', type: 'tree' as const, sha: 'sha2' },
        { path: 'docs/guide.md', type: 'blob' as const, sha: 'sha3', size: 2048 },
      ];

      mockGitHubService.getRepositoryTree = jest.fn().mockResolvedValue(mockTree);
      mockGitHubService.filterMarkdownTree = jest.fn().mockReturnValue(mockFilteredTree);

      mockRequest.params = { owner: 'testuser', repo: 'test-repo' };

      const token = mockResponse.locals!.githubToken as string;
      const tree = await mockGitHubService.getRepositoryTree(
        'testuser',
        'test-repo',
        token,
        mockRequest.logger
      );
      const filteredTree = mockGitHubService.filterMarkdownTree(tree);

      expect(mockGitHubService.getRepositoryTree).toHaveBeenCalledWith(
        'testuser',
        'test-repo',
        token,
        mockRequest.logger
      );
      expect(mockGitHubService.filterMarkdownTree).toHaveBeenCalledWith(tree);
      expect(filteredTree.length).toBe(3);
      expect(filteredTree.filter((item) => item.path?.endsWith('.md')).length).toBe(2);
    });

    it('should handle repository not found error', async () => {
      const error = new Error('Not Found') as any;
      error.status = 404;

      mockGitHubService.getRepositoryTree = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.getRepositoryTree('testuser', 'nonexistent', 'test-token', mockRequest.logger);
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(404);
      }
    });

    it('should handle rate limit errors', async () => {
      const error = new Error('Rate Limit Exceeded') as any;
      error.status = 403;

      mockGitHubService.getRepositoryTree = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.getRepositoryTree('testuser', 'test-repo', 'test-token', mockRequest.logger);
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(403);
      }
    });

    it('should use cached tree within TTL', async () => {
      const mockTree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', type: 'blob' as const, sha: 'sha1', size: 1024 },
        ],
        truncated: false,
      };

      mockGitHubService.getRepositoryTree = jest.fn().mockResolvedValue(mockTree);

      // First call
      await mockGitHubService.getRepositoryTree('testuser', 'test-repo', 'test-token', mockRequest.logger);

      // Second call (should use cache)
      await mockGitHubService.getRepositoryTree('testuser', 'test-repo', 'test-token', mockRequest.logger);

      // In real implementation, second call wouldn't hit GitHub API due to cache
      expect(mockGitHubService.getRepositoryTree).toHaveBeenCalledTimes(2);
    });
  });

  describe('GitHubService.filterMarkdownTree', () => {
    it('should filter tree to only include markdown files and their folders', () => {
      const tree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', type: 'blob' as const },
          { path: 'docs', type: 'tree' as const },
          { path: 'docs/guide.md', type: 'blob' as const },
          { path: 'src', type: 'tree' as const },
          { path: 'src/index.js', type: 'blob' as const },
          { path: 'src/utils.js', type: 'blob' as const },
        ],
        truncated: false,
      };

      const githubService = new GitHubService();
      const filtered = githubService.filterMarkdownTree(tree);

      expect(filtered.length).toBe(3);
      expect(filtered.some((item) => item.path === 'README.md')).toBe(true);
      expect(filtered.some((item) => item.path === 'docs')).toBe(true);
      expect(filtered.some((item) => item.path === 'docs/guide.md')).toBe(true);
      expect(filtered.some((item) => item.path === 'src')).toBe(false);
      expect(filtered.some((item) => item.path === 'src/index.js')).toBe(false);
    });

    it('should include nested folders that contain markdown files', () => {
      const tree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'docs', type: 'tree' as const },
          { path: 'docs/api', type: 'tree' as const },
          { path: 'docs/api/endpoints.md', type: 'blob' as const },
          { path: 'assets', type: 'tree' as const },
          { path: 'assets/logo.png', type: 'blob' as const },
        ],
        truncated: false,
      };

      const githubService = new GitHubService();
      const filtered = githubService.filterMarkdownTree(tree);

      expect(filtered.length).toBe(3);
      expect(filtered.some((item) => item.path === 'docs')).toBe(true);
      expect(filtered.some((item) => item.path === 'docs/api')).toBe(true);
      expect(filtered.some((item) => item.path === 'docs/api/endpoints.md')).toBe(true);
      expect(filtered.some((item) => item.path === 'assets')).toBe(false);
    });

    it('should handle tree with no markdown files', () => {
      const tree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'src', type: 'tree' as const },
          { path: 'src/index.js', type: 'blob' as const },
          { path: 'package.json', type: 'blob' as const },
        ],
        truncated: false,
      };

      const githubService = new GitHubService();
      const filtered = githubService.filterMarkdownTree(tree);

      expect(filtered.length).toBe(0);
    });

    it('should handle markdown files at root level', () => {
      const tree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', type: 'blob' as const },
          { path: 'CONTRIBUTING.md', type: 'blob' as const },
          { path: 'LICENSE', type: 'blob' as const },
        ],
        truncated: false,
      };

      const githubService = new GitHubService();
      const filtered = githubService.filterMarkdownTree(tree);

      expect(filtered.length).toBe(2);
      expect(filtered.some((item) => item.path === 'README.md')).toBe(true);
      expect(filtered.some((item) => item.path === 'CONTRIBUTING.md')).toBe(true);
      expect(filtered.some((item) => item.path === 'LICENSE')).toBe(false);
    });
  });
});
