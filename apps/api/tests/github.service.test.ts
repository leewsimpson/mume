import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GitHubService } from '../src/services/github.service.js';
import type { Octokit } from 'octokit';

describe('GitHubService', () => {
  let service: GitHubService;
  let mockOctokit: jest.Mocked<Octokit>;

  // Create mock functions
  const mockListForAuthenticatedUser = jest.fn();
  const mockGet = jest.fn();
  const mockGetContent = jest.fn();
  const mockCreateOrUpdateFileContents = jest.fn();
  const mockGetTree = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: mockListForAuthenticatedUser,
          get: mockGet,
          getContent: mockGetContent,
          createOrUpdateFileContents: mockCreateOrUpdateFileContents,
        },
        git: {
          getTree: mockGetTree,
        },
      },
    } as unknown as jest.Mocked<Octokit>;

    // Create service with mock Octokit factory
    service = new GitHubService(() => mockOctokit);
    service.clearAllCache();
  });

  describe('listUserRepositories', () => {
    it('should fetch repositories with write access', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'owner/repo1',
          owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
          description: 'Test repo',
          private: false,
          permissions: { push: true, pull: true, admin: false },
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'repo2',
          full_name: 'owner/repo2',
          owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
          description: 'Test repo 2',
          private: true,
          permissions: { push: false, pull: true, admin: false },
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockListForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      } as never);

      const result = await service.listUserRepositories('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('repo1');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledWith({
        affiliation: 'owner,collaborator,organization_member',
        per_page: 100,
        sort: 'updated',
      });
    });

    it('should filter out repositories without push permission', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'readonly',
          permissions: { push: false },
        },
        {
          id: 2,
          name: 'writable',
          permissions: { push: true },
        },
      ];

      mockListForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      } as never);

      const result = await service.listUserRepositories('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('writable');
    });

    it('should cache repository list for 5 minutes', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          permissions: { push: true },
        },
      ];

      mockListForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      } as never);

      // First call
      await service.listUserRepositories('test-token');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.listUserRepositories('test-token');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(1);
    });

    it('should use logger when provided', async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        metric: jest.fn(),
      };

      mockListForAuthenticatedUser.mockResolvedValue({
        data: [{ id: 1, permissions: { push: true } }],
      } as never);

      await service.listUserRepositories('test-token', mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetching repository list'),
        expect.any(Object)
      );
      expect(mockLogger.metric).toHaveBeenCalledWith(
        'github_api_duration_ms',
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle errors and log them', async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        metric: jest.fn(),
      };

      const error = new Error('API Error');
      mockListForAuthenticatedUser.mockRejectedValue(error);

      await expect(
        service.listUserRepositories('test-token', mockLogger)
      ).rejects.toThrow('API Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list'),
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should retry on rate limit error (403)', async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        metric: jest.fn(),
      };

      const rateLimitError = Object.assign(new Error('Rate limit'), {
        status: 403,
      });

      // Fail first two times, succeed on third
      mockListForAuthenticatedUser
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: [{ id: 1, permissions: { push: true } }],
        } as never);

      const result = await service.listUserRepositories('test-token', mockLogger);

      expect(result).toHaveLength(1);
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit'),
        expect.any(Object)
      );
    });
  });

  describe('getRepositoryTree', () => {
    it('should fetch repository tree recursively', async () => {
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' },
      } as never);

      const mockTree = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', type: 'blob', sha: 'def456' },
          { path: 'src/index.ts', type: 'blob', sha: 'ghi789' },
        ],
        truncated: false,
      };

      mockGetTree.mockResolvedValue({
        data: mockTree,
      } as never);

      const result = await service.getRepositoryTree('owner', 'repo', 'test-token');

      expect(result.tree).toHaveLength(2);
      expect(mockGet).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
      });
      expect(mockGetTree).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        tree_sha: 'main',
        recursive: 'true',
      });
    });

    it('should handle errors when fetching tree', async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        metric: jest.fn(),
      };

      const error = new Error('Not found');
      mockGet.mockRejectedValue(error);

      await expect(
        service.getRepositoryTree('owner', 'repo', 'test-token', mockLogger)
      ).rejects.toThrow('Not found');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getFileContent', () => {
    it('should fetch and decode file content', async () => {
      const content = 'Hello World';
      const encodedContent = Buffer.from(content).toString('base64');

      mockGetContent.mockResolvedValue({
        data: {
          name: 'test.md',
          path: 'docs/test.md',
          sha: 'abc123',
          size: 11,
          content: encodedContent,
          encoding: 'base64',
        },
      } as never);

      const result = await service.getFileContent(
        'owner',
        'repo',
        'docs/test.md',
        'test-token'
      );

      expect(result.content).toBe(content);
      expect(result.sha).toBe('abc123');
      expect(mockGetContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'docs/test.md',
      });
    });

    it('should handle special characters in content', async () => {
      const content = 'Special chars: émojis 🎉, ñoño, 中文';
      const encodedContent = Buffer.from(content).toString('base64');

      mockGetContent.mockResolvedValue({
        data: {
          name: 'test.md',
          path: 'test.md',
          sha: 'abc123',
          size: content.length,
          content: encodedContent,
          encoding: 'base64',
        },
      } as never);

      const result = await service.getFileContent(
        'owner',
        'repo',
        'test.md',
        'test-token'
      );

      expect(result.content).toBe(content);
    });

    it('should handle errors when fetching file', async () => {
      const error = Object.assign(new Error('Not found'), { status: 404 });
      mockGetContent.mockRejectedValue(error);

      await expect(
        service.getFileContent('owner', 'repo', 'missing.md', 'test-token')
      ).rejects.toThrow('Not found');
    });
  });

  describe('updateFile', () => {
    it('should update file with Base64 encoded content', async () => {
      const content = '# Updated Content';

      mockCreateOrUpdateFileContents.mockResolvedValue({
        data: {
          content: { sha: 'new-sha' },
          commit: { sha: 'commit-sha' },
        },
      } as never);

      const result = await service.updateFile(
        'owner',
        'repo',
        'docs/test.md',
        content,
        'old-sha',
        'Update test.md',
        'test-token'
      );

      expect(result.sha).toBe('new-sha');
      expect(result.commit).toBe('commit-sha');
      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'docs/test.md',
        message: 'Update test.md',
        content: Buffer.from(content).toString('base64'),
        sha: 'old-sha',
      });
    });

    it('should handle conflict error (409)', async () => {
      const error = Object.assign(new Error('Conflict'), { status: 409 });
      mockCreateOrUpdateFileContents.mockRejectedValue(error);

      await expect(
        service.updateFile(
          'owner',
          'repo',
          'test.md',
          'content',
          'old-sha',
          'Update',
          'test-token'
        )
      ).rejects.toThrow('Conflict');
    });
  });

  describe('createFile', () => {
    it('should create new file with Base64 encoded content', async () => {
      const content = '# New File';

      mockCreateOrUpdateFileContents.mockResolvedValue({
        data: {
          content: { sha: 'new-sha' },
          commit: { sha: 'commit-sha' },
        },
      } as never);

      const result = await service.createFile(
        'owner',
        'repo',
        'docs/new.md',
        content,
        'Create new.md',
        'test-token'
      );

      expect(result.sha).toBe('new-sha');
      expect(result.commit).toBe('commit-sha');
      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'docs/new.md',
        message: 'Create new.md',
        content: Buffer.from(content).toString('base64'),
      });
    });

    it('should handle file already exists error', async () => {
      const error = Object.assign(new Error('File exists'), { status: 422 });
      mockCreateOrUpdateFileContents.mockRejectedValue(error);

      await expect(
        service.createFile(
          'owner',
          'repo',
          'exists.md',
          'content',
          'Create',
          'test-token'
        )
      ).rejects.toThrow('File exists');
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific token', async () => {
      mockListForAuthenticatedUser.mockResolvedValue({
        data: [{ id: 1, permissions: { push: true } }],
      } as never);

      // Populate cache
      await service.listUserRepositories('test-token');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache('test-token');

      // Should fetch again
      await service.listUserRepositories('test-token');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      mockListForAuthenticatedUser.mockResolvedValue({
        data: [{ id: 1, permissions: { push: true } }],
      } as never);

      // Populate cache with multiple tokens
      await service.listUserRepositories('token1');
      await service.listUserRepositories('token2');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(2);

      // Clear all cache
      service.clearAllCache();

      // Should fetch again for both
      await service.listUserRepositories('token1');
      await service.listUserRepositories('token2');
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(4);
    });
  });
});
