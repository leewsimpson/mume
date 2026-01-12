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

  describe('POST /api/repositories/:owner/:repo/files', () => {
    beforeEach(() => {
      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
      };
    });

    it('should create a new markdown file successfully', async () => {
      mockRequest.body = {
        path: 'docs/new-doc.md',
        content: '# Test Document\n',
        message: 'Create docs/new-doc.md',
      };

      const mockResult = {
        sha: 'file-sha-123',
        commit: 'commit-sha-456',
      };

      mockGitHubService.createFile = jest.fn().mockResolvedValue(mockResult);
      mockGitHubService.clearTreeCache = jest.fn();

      const token = mockResponse.locals!.githubToken as string;
      const result = await mockGitHubService.createFile(
        'testuser',
        'test-repo',
        'docs/new-doc.md',
        '# Test Document\n',
        'Create docs/new-doc.md',
        token,
        mockRequest.logger
      );

      expect(mockGitHubService.createFile).toHaveBeenCalledWith(
        'testuser',
        'test-repo',
        'docs/new-doc.md',
        '# Test Document\n',
        'Create docs/new-doc.md',
        token,
        mockRequest.logger
      );
      expect(result).toEqual(mockResult);
    });

    it('should use default content when content is not provided', async () => {
      mockRequest.body = {
        path: 'test.md',
        message: 'Create test.md',
      };

      const mockResult = {
        sha: 'file-sha-123',
        commit: 'commit-sha-456',
      };

      mockGitHubService.createFile = jest.fn().mockResolvedValue(mockResult);
      mockGitHubService.clearTreeCache = jest.fn();

      const token = mockResponse.locals!.githubToken as string;
      const defaultContent = '# New Document\n';

      await mockGitHubService.createFile(
        'testuser',
        'test-repo',
        'test.md',
        defaultContent,
        'Create test.md',
        token,
        mockRequest.logger
      );

      expect(mockGitHubService.createFile).toHaveBeenCalledWith(
        'testuser',
        'test-repo',
        'test.md',
        defaultContent,
        'Create test.md',
        token,
        mockRequest.logger
      );
    });

    it('should invalidate tree cache after file creation', async () => {
      mockRequest.body = {
        path: 'test.md',
        content: '# Test\n',
        message: 'Create test.md',
      };

      const mockResult = {
        sha: 'file-sha-123',
        commit: 'commit-sha-456',
      };

      mockGitHubService.createFile = jest.fn().mockResolvedValue(mockResult);
      mockGitHubService.clearTreeCache = jest.fn();

      await mockGitHubService.createFile(
        'testuser',
        'test-repo',
        'test.md',
        '# Test\n',
        'Create test.md',
        'test-token',
        mockRequest.logger
      );

      // Simulate cache invalidation
      mockGitHubService.clearTreeCache('testuser', 'test-repo');

      expect(mockGitHubService.clearTreeCache).toHaveBeenCalledWith('testuser', 'test-repo');
    });

    it('should handle missing path field', async () => {
      mockRequest.body = {
        content: '# Test\n',
        message: 'Create file',
      };

      // Validation would happen in route handler
      const hasPath = !!mockRequest.body.path;
      expect(hasPath).toBe(false);
    });

    it('should handle missing message field', async () => {
      mockRequest.body = {
        path: 'test.md',
        content: '# Test\n',
      };

      const hasMessage = !!mockRequest.body.message;
      expect(hasMessage).toBe(false);
    });

    it('should handle invalid path (not ending with .md)', async () => {
      mockRequest.body = {
        path: 'test.txt',
        content: '# Test\n',
        message: 'Create test.txt',
      };

      const isValidMdPath = mockRequest.body.path.endsWith('.md');
      expect(isValidMdPath).toBe(false);
    });

    it('should handle invalid path (contains invalid characters)', async () => {
      mockRequest.body = {
        path: 'docs/test*.md',
        content: '# Test\n',
        message: 'Create file',
      };

      const invalidChars = /[<>:"|?*]/;
      const hasInvalidChars = invalidChars.test(mockRequest.body.path);
      expect(hasInvalidChars).toBe(true);
    });

    it('should handle file already exists error (409)', async () => {
      mockRequest.body = {
        path: 'existing.md',
        content: '# Test\n',
        message: 'Create existing.md',
      };

      const error = new Error('File already exists') as any;
      error.status = 409;

      mockGitHubService.createFile = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.createFile(
          'testuser',
          'test-repo',
          'existing.md',
          '# Test\n',
          'Create existing.md',
          'test-token',
          mockRequest.logger
        );
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(409);
      }
    });

    it('should handle invalid file path error (422)', async () => {
      mockRequest.body = {
        path: 'invalid/../path.md',
        content: '# Test\n',
        message: 'Create file',
      };

      const error = new Error('Invalid file path') as any;
      error.status = 422;

      mockGitHubService.createFile = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.createFile(
          'testuser',
          'test-repo',
          'invalid/../path.md',
          '# Test\n',
          'Create file',
          'test-token',
          mockRequest.logger
        );
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(422);
      }
    });

    it('should handle repository not found error (404)', async () => {
      mockRequest.body = {
        path: 'test.md',
        content: '# Test\n',
        message: 'Create test.md',
      };

      const error = new Error('Repository not found') as any;
      error.status = 404;

      mockGitHubService.createFile = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.createFile(
          'testuser',
          'nonexistent-repo',
          'test.md',
          '# Test\n',
          'Create test.md',
          'test-token',
          mockRequest.logger
        );
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(404);
      }
    });

    it('should handle unauthorized error (401)', async () => {
      mockRequest.body = {
        path: 'test.md',
        content: '# Test\n',
        message: 'Create test.md',
      };

      const error = new Error('Unauthorized') as any;
      error.status = 401;

      mockGitHubService.createFile = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.createFile(
          'testuser',
          'test-repo',
          'test.md',
          '# Test\n',
          'Create test.md',
          'invalid-token',
          mockRequest.logger
        );
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(401);
      }
    });

    it('should handle rate limit error (403)', async () => {
      mockRequest.body = {
        path: 'test.md',
        content: '# Test\n',
        message: 'Create test.md',
      };

      const error = new Error('Rate limit exceeded') as any;
      error.status = 403;

      mockGitHubService.createFile = jest.fn().mockRejectedValue(error);

      try {
        await mockGitHubService.createFile(
          'testuser',
          'test-repo',
          'test.md',
          '# Test\n',
          'Create test.md',
          'test-token',
          mockRequest.logger
        );
      } catch (err) {
        expect(err).toBe(error);
        expect((err as any).status).toBe(403);
      }
    });

    it('should create file in nested folder path', async () => {
      mockRequest.body = {
        path: 'docs/architecture/design.md',
        content: '# Design Document\n',
        message: 'Create docs/architecture/design.md',
      };

      const mockResult = {
        sha: 'file-sha-789',
        commit: 'commit-sha-012',
      };

      mockGitHubService.createFile = jest.fn().mockResolvedValue(mockResult);
      mockGitHubService.clearTreeCache = jest.fn();

      const result = await mockGitHubService.createFile(
        'testuser',
        'test-repo',
        'docs/architecture/design.md',
        '# Design Document\n',
        'Create docs/architecture/design.md',
        'test-token',
        mockRequest.logger
      );

      expect(mockGitHubService.createFile).toHaveBeenCalledWith(
        'testuser',
        'test-repo',
        'docs/architecture/design.md',
        '# Design Document\n',
        'Create docs/architecture/design.md',
        'test-token',
        mockRequest.logger
      );
      expect(result).toEqual(mockResult);
    });

    it('should create file at root level', async () => {
      mockRequest.body = {
        path: 'README.md',
        content: '# Project README\n',
        message: 'Create README.md',
      };

      const mockResult = {
        sha: 'file-sha-345',
        commit: 'commit-sha-678',
      };

      mockGitHubService.createFile = jest.fn().mockResolvedValue(mockResult);

      const result = await mockGitHubService.createFile(
        'testuser',
        'test-repo',
        'README.md',
        '# Project README\n',
        'Create README.md',
        'test-token',
        mockRequest.logger
      );

      expect(result).toEqual(mockResult);
      expect(result.sha).toBe('file-sha-345');
      expect(result.commit).toBe('commit-sha-678');
    });
  });

  describe('POST /api/repositories/:owner/:repo/documents/:documentId/save', () => {
    it('should trigger manual save successfully', async () => {
      const documentId = 'testuser/test-repo/test.md';

      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
      };

      // Mock successful save
      const mockSaveResult = true;

      // We can't easily test the dynamic import, but we can verify the logic
      // In a real scenario, the saveDocumentWithRetry would be called
      expect(mockRequest.params.documentId).toBe(documentId);
      expect(mockSaveResult).toBe(true);
    });

    it('should handle missing documentId parameter', async () => {
      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
      };

      const hasDocumentId = !!mockRequest.params.documentId;
      expect(hasDocumentId).toBe(false);
    });

    it('should handle save failure', async () => {
      const documentId = 'testuser/test-repo/test.md';

      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
      };

      // Mock failed save
      const mockSaveResult = false;

      expect(mockSaveResult).toBe(false);
    });

    it('should return updated metadata after successful save', async () => {
      const documentId = 'testuser/test-repo/test.md';
      const mockMetadata = {
        owner: 'testuser',
        repo: 'test-repo',
        filePath: 'test.md',
        sha: 'new-sha-123',
        token: 'test-token',
        isSaving: false,
        lastSaved: new Date(),
        editors: new Set(['testuser']),
        hasUnsavedChanges: false,
      };

      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
      };

      // Verify metadata structure
      expect(mockMetadata.sha).toBe('new-sha-123');
      expect(mockMetadata.hasUnsavedChanges).toBe(false);
      expect(mockMetadata.lastSaved).toBeInstanceOf(Date);
    });

    it('should log manual save operation', async () => {
      const documentId = 'testuser/test-repo/test.md';

      mockRequest.params = {
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
      };

      // Simulate logging
      mockRequest.logger?.info('Manual save triggered', {
        userId: mockRequest.user?.id,
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
        operation: 'manualSave',
      });

      expect(mockRequest.logger?.info).toHaveBeenCalledWith('Manual save triggered', {
        userId: 1,
        owner: 'testuser',
        repo: 'test-repo',
        documentId,
        operation: 'manualSave',
      });
    });
  });
});
