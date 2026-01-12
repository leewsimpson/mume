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
}

/**
 * Reset mock state between tests
 */
export function resetGitHubApiMockState(): void {
  fileUpdates.clear();
  createdFiles.clear();
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
