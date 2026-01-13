import type { Page, Route } from '@playwright/test';

/**
 * Mock GitHub API responses for E2E testing
 *
 * This mock intercepts calls to the GitHub API via our backend
 * and returns controlled test data.
 */

export interface MockRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  updated_at: string;
  default_branch: string;
}

export interface MockTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface MockFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
}

// Default test repositories
export const TEST_REPOSITORIES: MockRepository[] = [
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
    default_branch: 'main',
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
    default_branch: 'main',
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
    default_branch: 'main',
  },
];

// Default test file tree
export const TEST_TREE: MockTreeItem[] = [
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
];

// Default test file contents
export const TEST_FILES: Record<string, MockFileContent> = {
  'README.md': {
    name: 'README.md',
    path: 'README.md',
    sha: 'abc123',
    size: 1024,
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
  },
  'docs/getting-started.md': {
    name: 'getting-started.md',
    path: 'docs/getting-started.md',
    sha: 'ghi789',
    size: 2048,
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
  },
  'docs/api-reference.md': {
    name: 'api-reference.md',
    path: 'docs/api-reference.md',
    sha: 'jkl012',
    size: 4096,
    content: `# API Reference

## Authentication

All API endpoints require authentication via GitHub OAuth.

### Endpoints

- \`GET /auth/user\` - Get current user
- \`POST /auth/logout\` - Logout

## Repositories

- \`GET /api/repositories\` - List repositories
- \`GET /api/repositories/:owner/:repo/tree\` - Get file tree
- \`GET /api/repositories/:owner/:repo/files/:path\` - Get file content
- \`PUT /api/repositories/:owner/:repo/files/:path\` - Update file
- \`POST /api/repositories/:owner/:repo/files\` - Create file

## Comments

- \`GET /api/comments/:owner/:repo/:path\` - Get comments for file
- \`POST /api/comments\` - Create comment
- \`PATCH /api/comments/:id\` - Update comment
- \`DELETE /api/comments/:id\` - Delete comment
`,
  },
  'docs/examples/basic.md': {
    name: 'basic.md',
    path: 'docs/examples/basic.md',
    sha: 'pqr678',
    size: 512,
    content: `# Basic Example

This is a basic example of markdown content.

## Code Block

\`\`\`javascript
console.log('Hello, World!');
\`\`\`

## List

- Item 1
- Item 2
- Item 3
`,
  },
  'docs/examples/advanced.md': {
    name: 'advanced.md',
    path: 'docs/examples/advanced.md',
    sha: 'stu901',
    size: 1536,
    content: `# Advanced Example

This demonstrates more advanced markdown features.

## Table

| Feature | Status |
|---------|--------|
| Tables | Supported |
| Code | Supported |
| Images | Supported |

## Task List

- [x] Complete setup
- [ ] Write documentation
- [ ] Add tests

## Blockquote

> This is a blockquote
> spanning multiple lines.
`,
  },
  'notes/meeting-notes.md': {
    name: 'meeting-notes.md',
    path: 'notes/meeting-notes.md',
    sha: 'yza567',
    size: 768,
    content: `# Meeting Notes

## 2024-01-15 - Project Kickoff

### Attendees
- Alice
- Bob
- Charlie

### Agenda
1. Project overview
2. Timeline discussion
3. Task assignment

### Action Items
- [ ] Alice: Set up repository
- [ ] Bob: Create initial designs
- [ ] Charlie: Research technologies
`,
  },
  'CHANGELOG.md': {
    name: 'CHANGELOG.md',
    path: 'CHANGELOG.md',
    sha: 'bcd890',
    size: 3072,
    content: `# Changelog

## [1.0.0] - 2024-01-01

### Added
- Initial release
- GitHub OAuth authentication
- Real-time collaborative editing
- Comment threads
- Markdown preview

### Changed
- N/A

### Fixed
- N/A
`,
  },
};

// Track file updates for testing
let fileUpdates: Map<string, { content: string; sha: string; message: string }> = new Map();
let createdFiles: Map<string, { content: string; sha: string; message: string }> = new Map();

// Track comments for testing (stored as mock comment data keyed by filePath)
interface MockComment {
  id: string;
  charStart: number;
  charEnd: number;
  author: { username: string; avatarUrl: string };
  text: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    author: { username: string; avatarUrl: string };
    text: string;
    createdAt: string;
  }>;
}

interface MockCommentData {
  version: number;
  documentPath: string;
  comments: MockComment[];
}

let mockComments: Map<string, MockCommentData> = new Map();

/**
 * Setup GitHub API mocking for backend routes
 * This intercepts our backend's API routes and returns mock data
 */
export async function setupGitHubApiMock(page: Page): Promise<void> {
  const apiBaseUrl = 'http://localhost:3000';

  // Mock repository list
  await page.route(`${apiBaseUrl}/api/repositories`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_REPOSITORIES),
      });
    } else {
      await route.continue();
    }
  });

  // Mock repository tree
  await page.route(`${apiBaseUrl}/api/repositories/*/*/tree`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sha: 'main-sha',
        url: 'https://api.github.com/repos/test/tree',
        tree: TEST_TREE,
        truncated: false,
      }),
    });
  });

  // Mock file content GET
  await page.route(`${apiBaseUrl}/api/repositories/*/*/files/**`, async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Extract file path from URL
    const match = url.match(/\/files\/(.+)$/);
    const filePath = match?.[1] ? decodeURIComponent(match[1]) : '';

    if (method === 'GET') {
      // Check if file was updated
      const updated = fileUpdates.get(filePath);
      if (updated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: updated.content,
            sha: updated.sha,
          }),
        });
        return;
      }

      // Check if file was created
      const created = createdFiles.get(filePath);
      if (created) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: created.content,
            sha: created.sha,
          }),
        });
        return;
      }

      // Return mock file content
      const file = TEST_FILES[filePath];
      if (file) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: file.content,
            sha: file.sha,
          }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File not found' }),
        });
      }
    } else if (method === 'PUT') {
      // Mock file update
      const body = route.request().postDataJSON();
      const newSha = `sha-${Date.now()}`;

      fileUpdates.set(filePath, {
        content: body.content,
        sha: newSha,
        message: body.message,
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sha: newSha,
          commit: `commit-${Date.now()}`,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock file creation POST
  await page.route(`${apiBaseUrl}/api/repositories/*/*/files`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const filePath = body.path;
      const newSha = `sha-${Date.now()}`;

      // Check if file already exists
      if (TEST_FILES[filePath] || createdFiles.has(filePath)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File already exists' }),
        });
        return;
      }

      createdFiles.set(filePath, {
        content: body.content,
        sha: newSha,
        message: body.message,
      });

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          sha: newSha,
          commit: `commit-${Date.now()}`,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock comments GET
  await page.route(`${apiBaseUrl}/api/repositories/*/*/comments*`, async (route: Route) => {
    const url = new URL(route.request().url());
    const filePath = url.searchParams.get('filePath') || '';
    const commentsKey = filePath;
    
    const commentData = mockComments.get(commentsKey);
    
    if (commentData) {
      // Convert to API format
      const apiComments = commentData.comments.map((c) => ({
        id: c.id,
        documentPath: commentData.documentPath,
        repoOwner: 'alice-test',
        repoName: 'test-docs',
        charStart: c.charStart,
        charEnd: c.charEnd,
        text: c.text,
        resolved: c.resolved,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        userId: 1,
        user: {
          id: 1,
          username: c.author.username,
          avatarUrl: c.author.avatarUrl,
        },
        replies: c.replies.map((r) => ({
          id: r.id,
          commentId: c.id,
          userId: 1,
          text: r.text,
          createdAt: r.createdAt,
          updatedAt: r.createdAt,
          user: {
            id: 1,
            username: r.author.username,
            avatarUrl: r.author.avatarUrl,
          },
        })),
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiComments),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });

  // Mock comment creation POST
  await page.route(`${apiBaseUrl}/api/comments`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const { documentPath, repoOwner, repoName, charStart, charEnd, text } = body;
      const commentsKey = documentPath;
      
      let commentData = mockComments.get(commentsKey);
      if (!commentData) {
        commentData = {
          version: 1,
          documentPath,
          comments: [],
        };
      }
      
      const newComment: MockComment = {
        id: `c-${Date.now()}`,
        charStart,
        charEnd,
        author: { username: 'alice-test', avatarUrl: 'https://avatars.githubusercontent.com/u/12345' },
        text,
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };
      
      commentData.comments.push(newComment);
      mockComments.set(commentsKey, commentData);
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: newComment.id,
          documentPath,
          repoOwner,
          repoName,
          charStart,
          charEnd,
          text,
          resolved: false,
          createdAt: newComment.createdAt,
          updatedAt: newComment.updatedAt,
          userId: 1,
          user: {
            id: 1,
            username: newComment.author.username,
            avatarUrl: newComment.author.avatarUrl,
          },
          replies: [],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock comment replies POST
  await page.route(`${apiBaseUrl}/api/comments/*/replies`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      const url = route.request().url();
      const commentIdMatch = url.match(/\/api\/comments\/([^/]+)\/replies/);
      const commentId = commentIdMatch?.[1];
      
      const body = route.request().postDataJSON();
      const { text, documentPath } = body;
      
      const commentData = mockComments.get(documentPath);
      if (commentData) {
        const comment = commentData.comments.find((c) => c.id === commentId);
        if (comment) {
          const reply = {
            id: `r-${Date.now()}`,
            author: { username: 'alice-test', avatarUrl: 'https://avatars.githubusercontent.com/u/12345' },
            text,
            createdAt: new Date().toISOString(),
          };
          comment.replies.push(reply);
          
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: reply.id,
              commentId,
              userId: 1,
              text,
              createdAt: reply.createdAt,
              updatedAt: reply.createdAt,
              user: {
                id: 1,
                username: reply.author.username,
                avatarUrl: reply.author.avatarUrl,
              },
            }),
          });
          return;
        }
      }
      
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Comment not found' }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock comment PATCH (resolve/unresolve)
  await page.route(`${apiBaseUrl}/api/comments/*`, async (route: Route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    // Skip if this is the replies endpoint
    if (url.includes('/replies')) {
      await route.continue();
      return;
    }
    
    if (method === 'PATCH') {
      const commentIdMatch = url.match(/\/api\/comments\/([^/?]+)/);
      const commentId = commentIdMatch?.[1];
      
      const body = route.request().postDataJSON();
      const { resolved, documentPath } = body;
      
      const commentData = mockComments.get(documentPath);
      if (commentData) {
        const comment = commentData.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.resolved = resolved;
          comment.updatedAt = new Date().toISOString();
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: comment.id,
              documentPath,
              charStart: comment.charStart,
              charEnd: comment.charEnd,
              text: comment.text,
              resolved: comment.resolved,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              userId: 1,
              user: {
                id: 1,
                username: comment.author.username,
                avatarUrl: comment.author.avatarUrl,
              },
              replies: comment.replies,
            }),
          });
          return;
        }
      }
      
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Comment not found' }),
      });
    } else if (method === 'DELETE') {
      const commentIdMatch = url.match(/\/api\/comments\/([^/?]+)/);
      const commentId = commentIdMatch?.[1];
      
      const urlObj = new URL(url);
      const documentPath = urlObj.searchParams.get('documentPath') || '';
      
      const commentData = mockComments.get(documentPath);
      if (commentData) {
        const index = commentData.comments.findIndex((c) => c.id === commentId);
        if (index !== -1) {
          commentData.comments.splice(index, 1);
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Comment deleted' }),
          });
          return;
        }
      }
      
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Comment not found' }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Reset mock state between tests
 */
export function resetGitHubApiMockState(): void {
  fileUpdates.clear();
  createdFiles.clear();
  mockComments.clear();
}

/**
 * Get file updates made during test
 */
export function getFileUpdates(): Map<string, { content: string; sha: string; message: string }> {
  return new Map(fileUpdates);
}

/**
 * Get files created during test
 */
export function getCreatedFiles(): Map<string, { content: string; sha: string; message: string }> {
  return new Map(createdFiles);
}

/**
 * Add a custom repository to the mock data
 */
export function addMockRepository(repo: MockRepository): void {
  TEST_REPOSITORIES.push(repo);
}

/**
 * Add a custom file to the mock data
 */
export function addMockFile(path: string, content: MockFileContent): void {
  TEST_FILES[path] = content;
}

/**
 * Seed mock comments for testing
 */
export function seedMockComments(
  filePath: string,
  userId: number,
  username: string = 'alice-test',
  avatarUrl: string = 'https://avatars.githubusercontent.com/u/12345'
): void {
  const commentData: MockCommentData = {
    version: 1,
    documentPath: filePath,
    comments: [
      {
        id: `c-test-${Date.now()}`,
        charStart: 10,
        charEnd: 50,
        author: { username, avatarUrl },
        text: 'This is a seeded test comment',
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      },
    ],
  };
  mockComments.set(filePath, commentData);
}

/**
 * Get mock comments for testing
 */
export function getMockComments(filePath: string): MockCommentData | undefined {
  return mockComments.get(filePath);
}
