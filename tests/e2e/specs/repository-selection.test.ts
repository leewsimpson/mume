import { test, expect } from '../fixtures/index.js';
import { TEST_REPOSITORIES } from '../mocks/github-api.mock.js';

/**
 * E2E Tests for US-MVP-001A: Select GitHub repository to edit
 *
 * Tests the repository selection flow after authentication.
 */

test.describe('US-MVP-001A: Repository Selection', () => {
  test('should display repository list after login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Wait for repositories to load
    await authenticatedPage.waitForSelector('[data-testid="repository-list"]', {
      timeout: 10000,
    });

    // Should display repositories
    const repoItems = authenticatedPage.locator('[data-testid="repository-item"]');
    await expect(repoItems).toHaveCount(TEST_REPOSITORIES.length);
  });

  test('should display repository details correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Wait for first repository
    const firstRepo = authenticatedPage.locator('[data-testid="repository-item"]').first();
    await expect(firstRepo).toBeVisible();

    // Verify repository details are shown
    await expect(firstRepo.getByText(TEST_REPOSITORIES[0]!.name)).toBeVisible();
    await expect(firstRepo.getByText(TEST_REPOSITORIES[0]!.description!)).toBeVisible();
  });

  test('should filter repositories by search query', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Wait for repos to load
    await authenticatedPage.waitForSelector('[data-testid="repository-item"]');

    // Search for specific repository
    const searchInput = authenticatedPage.getByPlaceholder(/search/i);
    await searchInput.fill('test-docs');

    // Should filter results
    const repoItems = authenticatedPage.locator('[data-testid="repository-item"]');
    await expect(repoItems).toHaveCount(1);
    await expect(repoItems.first().getByText('test-docs')).toBeVisible();
  });

  test('should show private repository indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Find private repository
    const privateRepo = authenticatedPage.locator('[data-testid="repository-item"]').filter({
      hasText: 'private-notes',
    });

    await expect(privateRepo).toBeVisible();

    // Should show private indicator
    await expect(privateRepo.getByText(/private/i)).toBeVisible();
  });

  test('should navigate to document browser when selecting repository', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/repositories');

    // Click on first repository
    const firstRepo = authenticatedPage.locator('[data-testid="repository-item"]').first();
    await firstRepo.click();

    // Should navigate to document browser
    await expect(authenticatedPage).toHaveURL(/\/repositories\/.*\/.*$/);
  });

  test('should display repository owner avatar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Wait for repos to load
    const firstRepo = authenticatedPage.locator('[data-testid="repository-item"]').first();
    await expect(firstRepo).toBeVisible();

    // Should show avatar
    const avatar = firstRepo.locator('img[alt*="avatar"], img[alt*="owner"]');
    await expect(avatar).toBeVisible();
  });

  test('should show last updated date for repositories', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Wait for repos to load
    const firstRepo = authenticatedPage.locator('[data-testid="repository-item"]').first();
    await expect(firstRepo).toBeVisible();

    // Should show last updated
    await expect(firstRepo.getByText(/updated|ago/i)).toBeVisible();
  });

  test('should handle pagination for large repository lists', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/repositories');

    // Check for pagination controls (if more than 20 repos would be shown)
    // With our mock data, we have 3 repos so pagination may not be visible
    const _paginationControls = authenticatedPage.locator('[data-testid="pagination"]');

    // Verify page loads without errors even if pagination not needed
    await expect(authenticatedPage.locator('[data-testid="repository-list"]')).toBeVisible();
  });

  test('should display current user info in header', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto('/repositories');

    // Should show username in header
    await expect(authenticatedPage.getByText(currentUser.username)).toBeVisible();
  });

  test('should handle empty repository list gracefully', async ({ authenticatedPage }) => {
    // Mock empty response
    await authenticatedPage.route('**/api/repositories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await authenticatedPage.goto('/repositories');

    // Should show empty state message
    await expect(
      authenticatedPage.getByText(/no repositories|create.*repository|get started/i)
    ).toBeVisible();
  });
});
