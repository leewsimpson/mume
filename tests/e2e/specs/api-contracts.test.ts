import { test, expect } from '../fixtures/index.js';

/**
 * API Contract Tests
 *
 * These tests verify that API endpoints exist and match the expected contract.
 * They help catch mismatches between frontend and backend API expectations.
 *
 * These tests run against the real backend to ensure endpoints are properly defined.
 */

test.describe('API Contract Verification', () => {
  const API_BASE = 'http://localhost:3000';

  test('GET /api/repositories/:owner/:repo/comments should accept filePath query parameter', async ({ authenticatedPage }) => {
    // Make authenticated request via page context
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories/alice-test/test-docs/comments?filePath=README.md`
    );

    // Should not be 404 - might be 200 (with data) or 200 (empty array)
    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);

    // Verify it returns JSON array
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/repositories/:owner/:repo/comments should reject requests without filePath', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories/alice-test/test-docs/comments`
    );

    // Should return 400 Bad Request when filePath is missing
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('path');
  });

  test('POST /api/repositories/:owner/:repo/documents/:docId/save should exist', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(
      `${API_BASE}/api/repositories/alice-test/test-docs/documents/test-doc/save`
    );

    // Should not be 404 - might be 400/500 due to missing document, but endpoint exists
    expect(response.status()).not.toBe(404);
  });

  test('GET /api/repositories/:owner/:repo/tree should exist and return tree structure', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories/alice-test/test-docs/tree`
    );

    // Should succeed (or fail with non-404 if repo doesn't exist in test GitHub mock)
    expect(response.status()).not.toBe(404);

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('tree');
      expect(Array.isArray(body.tree)).toBe(true);
    }
  });

  test('GET /api/repositories/:owner/:repo/files/:path should exist', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories/alice-test/test-docs/files/README.md`
    );

    // Should not be 404 - endpoint exists
    expect(response.status()).not.toBe(404);

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('content');
      expect(body).toHaveProperty('sha');
    }
  });

  test('POST /api/repositories/:owner/:repo/files should exist for file creation', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(
      `${API_BASE}/api/repositories/alice-test/test-docs/files`,
      {
        data: {
          path: 'test-file.md',
          content: '# Test',
          message: 'Create test file',
        },
      }
    );

    // Should not be 404 - endpoint exists
    expect(response.status()).not.toBe(404);
  });

  test('POST /api/repositories/:owner/:repo/documents/register should exist', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(
      `${API_BASE}/api/repositories/alice-test/test-docs/documents/register`,
      {
        data: {
          filePath: 'README.md',
          sha: 'abc123',
          documentId: 'test-doc',
          userName: 'test-user',
        },
      }
    );

    // Should not be 404 - endpoint exists
    expect(response.status()).not.toBe(404);
  });

  test('GET /api/repositories should return user repositories', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/repositories/select should accept repository selection', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(
      `${API_BASE}/api/repositories/select`,
      {
        data: {
          owner: 'alice-test',
          name: 'test-docs',
          fullName: 'alice-test/test-docs',
        },
      }
    );

    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/repositories/selected should return selected repository', async ({ authenticatedPage }) => {
    // First select a repository
    await authenticatedPage.request.post(
      `${API_BASE}/api/repositories/select`,
      {
        data: {
          owner: 'alice-test',
          name: 'test-docs',
          fullName: 'alice-test/test-docs',
        },
      }
    );

    // Then retrieve it
    const response = await authenticatedPage.request.get(
      `${API_BASE}/api/repositories/selected`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('owner');
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('fullName');
  });
});
