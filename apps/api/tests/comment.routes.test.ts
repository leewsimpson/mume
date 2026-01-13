
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import yaml from 'js-yaml';

// Define types for our mocks
type MockRedisUserService = {
  getUserById: jest.Mock;
  saveUser: jest.Mock;
  saveToken: jest.Mock;
  getToken: jest.Mock;
};

type MockGitHubServiceInstance = {
  getCommentFile: jest.Mock;
  saveCommentFile: jest.Mock;
};

describe('Comment Routes', () => {
  let app: express.Application;
  let commentRoutes: any;
  let mockGetCommentFile: jest.Mock;
  let mockSaveCommentFile: jest.Mock;

  // Test data
  const mockCommentId = 'comment-123';
  const mockRepoOwner = 'owner';
  const mockRepoName = 'repo';
  const mockDocumentPath = 'docs/test.md';
  const mockFileSha = 'sha-123';

  beforeAll(async () => {
    // 1. Mock server.js
    await jest.unstable_mockModule('../src/server.js', () => ({
      redisUserService: {
        getUserById: jest.fn(),
        saveUser: jest.fn(),
        saveToken: jest.fn(),
        getToken: jest.fn().mockResolvedValue({
          accessTokenEncrypted: 'mock-encrypted',
          accessTokenIv: 'mock-iv',
          accessTokenAuthTag: 'mock-tag',
        }),
      }
    }));

    // 2. Mock GitHubService
    mockGetCommentFile = jest.fn();
    mockSaveCommentFile = jest.fn();

    await jest.unstable_mockModule('../src/services/github.service.js', () => ({
      GitHubService: jest.fn().mockImplementation(() => ({
        getCommentFile: mockGetCommentFile,
        saveCommentFile: mockSaveCommentFile,
      })),
    }));

    // 3. Mock TokenService
    await jest.unstable_mockModule('../src/services/token.service.js', () => ({
      decryptToken: jest.fn().mockReturnValue('mock-github-token'),
      encryptToken: jest.fn().mockReturnValue({
        encryptedData: 'mock-encrypted',
        iv: 'mock-iv',
        authTag: 'mock-tag',
      }),
      validateEncryptionKey: jest.fn().mockReturnValue(true),
    }));

    // 4. Mock Middleware
    await jest.unstable_mockModule('../src/middleware/authenticate.js', () => ({
      authenticate: (req: any, res: any, next: any) => {
        req.isAuthenticated = () => true;
        req.user = {
          id: 123,
          username: 'testuser',
          avatarUrl: 'https://example.com/avatar.png',
          githubId: 'gh-123',
          email: 'test@example.com'
        };
        next();
      },
    }));

    await jest.unstable_mockModule('../src/middleware/validateGitHubToken.js', () => ({
      validateGitHubToken: (req: any, res: any, next: any) => {
        res.locals.githubToken = 'mock-github-token';
        next();
      },
    }));

    // 5. Mock Passport
    await jest.unstable_mockModule('../src/config/passport.js', () => ({
      configurePassport: jest.fn(),
      validateOAuthConfig: jest.fn(),
    }));

    await jest.unstable_mockModule('passport', () => ({
      default: {
        serializeUser: jest.fn(),
        deserializeUser: jest.fn(),
        use: jest.fn(),
        initialize: () => (req: any, res: any, next: any) => next(),
        session: () => (req: any, res: any, next: any) => next(),
      }
    }));

    // Import the module AFTER mocks are established
    const commentRoutesModule = await import('../src/routes/comment.routes.js');
    commentRoutes = commentRoutesModule.default;

    app = express();
    app.use(express.json());
    // Manually ensure req.user is set (double safety)
    app.use((req: any, res, next) => {
       req.user = {
          id: 123,
          username: 'testuser',
          avatarUrl: 'https://example.com/avatar.png',
          githubId: 'gh-123',
          email: 'test@example.com'
        };
        next();
    });
    app.use('/api/comments', commentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create valid comment file content
  const createMockCommentFileContent = (comments: any[]) => {
    const data = {
      version: 1,
      documentPath: 'docs/test.md',
      comments: comments
    };
    
    const yamlStr = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
    
    return `---\n${yamlStr}---\n\n# Comments\n`;
  };

  describe('POST /:commentId/replies', () => {
    const validPayload = {
      text: 'This is a reply',
      documentPath: mockDocumentPath,
      repoOwner: mockRepoOwner,
      repoName: mockRepoName
    };

    it('should create a reply successfully', async () => {
      const existingComments = [{
        id: mockCommentId,
        charStart: 10,
        charEnd: 20,
        author: { username: 'otheruser', avatarUrl: 'url' },
        text: 'Original comment',
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: []
      }];

      const content = createMockCommentFileContent(existingComments);
      
      mockGetCommentFile.mockResolvedValue({
        content: content,
        sha: mockFileSha,
        path: `${mockDocumentPath}.comments.json`
      });

      mockSaveCommentFile.mockResolvedValue({
        content: { sha: 'new-sha' },
        commit: { sha: 'commit-sha' }
      });

      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(validPayload);

      if (response.status !== 201) {
          console.error('API Error Response:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('text', validPayload.text);
      expect(response.body).toHaveProperty('commentId', mockCommentId);
    });

    it('should return 400 if text is missing', async () => {
      const { text, ...invalidPayload } = validPayload;
      
      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/empty/);
    });

    it('should return 400 if repository info is missing', async () => {
      const invalidPayload = {
        text: 'Reply',
      };
      
      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Missing required fields/);
    });

    it('should return 404 if comment file does not exist', async () => {
      mockGetCommentFile.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/Comment file not found/);
    });

    it('should return 404 if comment does not exist in file', async () => {
      // File exists but has no comments
      mockGetCommentFile.mockResolvedValue({
        content: createMockCommentFileContent([]),
        sha: mockFileSha,
        path: `${mockDocumentPath}.comments.json`
      });

      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/Comment not found/);
    });

    it('should handle errors during save', async () => {
      const existingComments = [{
        id: mockCommentId,
        charStart: 10,
        charEnd: 20,
        author: { username: 'otheruser', avatarUrl: 'url' },
        text: 'Original comment',
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: []
      }];

      mockGetCommentFile.mockResolvedValue({
        content: createMockCommentFileContent(existingComments),
        sha: mockFileSha,
        path: `${mockDocumentPath}.comments.json`
      });

      mockSaveCommentFile.mockRejectedValue(new Error('GitHub API Error'));

      const response = await request(app)
        .post(`/api/comments/${mockCommentId}/replies`)
        .send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create reply');
    });
  });
});
