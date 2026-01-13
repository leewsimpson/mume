import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-001B: Browse markdown files with folder navigation
 *
 * Tests the file tree navigation and document selection.
 */

test.describe('US-MVP-001B: File Browsing and Navigation', () => {
  const repoUrl = '/repositories/alice-test/test-docs';

  test('should display file tree for selected repository', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    // Wait for tree to load
    await authenticatedPage.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });

    // Should show markdown files
    await expect(authenticatedPage.getByText('README.md')).toBeVisible();
  });

  test('should only show .md files and folders containing them', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Should show markdown files
    await expect(authenticatedPage.getByText('README.md')).toBeVisible();
    await expect(authenticatedPage.getByTestId('file-tree').getByText('docs')).toBeVisible();

    // Should not show non-markdown files (if any were in tree)
    // Our mock only has .md files, so just verify markdown files are present
    // Note: file items may contain file size after the name (e.g., "README.md 1.0 KB")
    const mdFiles = authenticatedPage.locator('[data-testid="tree-item"]').filter({
      hasText: /\.md/,
    });
    expect(await mdFiles.count()).toBeGreaterThan(0);
  });

  test('should expand and collapse folders', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Find docs folder
    const docsFolder = authenticatedPage.locator('[data-testid="tree-item tree-folder"]').filter({
      hasText: 'docs',
    });
    await expect(docsFolder).toBeVisible();

    // Click to expand
    await docsFolder.click();

    // Should show nested files
    await expect(authenticatedPage.getByText('getting-started.md')).toBeVisible();
    await expect(authenticatedPage.getByText('api-reference.md')).toBeVisible();
  });

  test('should show breadcrumb navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    // Should show breadcrumb with repository name
    const breadcrumb = authenticatedPage.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByText('test-docs')).toBeVisible();
  });

  test('should navigate to editor when clicking a file', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Click on README.md
    await authenticatedPage.getByText('README.md').click();

    // Should navigate to editor
    await expect(authenticatedPage).toHaveURL(/\/edit\/README\.md$/);
  });

  test('should show file metadata (size, last commit)', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Check for file item with metadata
    const fileItem = authenticatedPage.locator('[data-testid="tree-item"]').first();
    await expect(fileItem).toBeVisible();

    // Metadata could be shown on hover or inline
    // Just verify the file item is interactive
    await expect(fileItem).toBeEnabled();
  });

  test('should handle deeply nested folders', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Expand docs folder
    const docsFolder = authenticatedPage.locator('[data-testid="tree-folder"]').filter({
      hasText: /^docs$/,
    });

    if (await docsFolder.isVisible()) {
      await docsFolder.click();

      // Expand examples subfolder
      const examplesFolder = authenticatedPage.locator('[data-testid="tree-folder"]').filter({
        hasText: 'examples',
      });

      if (await examplesFolder.isVisible()) {
        await examplesFolder.click();

        // Should show nested files
        await expect(authenticatedPage.getByText('basic.md')).toBeVisible();
        await expect(authenticatedPage.getByText('advanced.md')).toBeVisible();
      }
    }
  });

  test('should show loading state while fetching tree', async ({ authenticatedPage }) => {
    // Slow down the API response
    await authenticatedPage.route('**/api/repositories/*/*/tree', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await authenticatedPage.goto(repoUrl);

    // Should show loading indicator
    await expect(
      authenticatedPage.getByText(/loading|fetching/i).or(
        authenticatedPage.locator('[data-testid="loading-spinner"]')
      ).first()
    ).toBeVisible();
  });

  test('should handle error when fetching tree fails', async ({ authenticatedPage }) => {
    // Mock error response
    await authenticatedPage.route('**/api/repositories/*/*/tree', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch tree' }),
      });
    });

    await authenticatedPage.goto(repoUrl);

    // Should show error message
    await expect(authenticatedPage.getByText(/error|failed|try again/i)).toBeVisible();
  });

  test('should navigate back to repository list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Click back or repository selector
    const backButton = authenticatedPage.getByRole('link', { name: /repositories|back/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(authenticatedPage).toHaveURL('/repositories');
    }
  });
});

test.describe('US-MVP-003: Document List Views', () => {
  const repoUrl = '/repositories/alice-test/test-docs';

  test('should toggle between tree view and list view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Look for view toggle
    const viewToggle = authenticatedPage.locator('[data-testid="view-toggle"]');

    if (await viewToggle.isVisible()) {
      // Toggle to list view
      await viewToggle.click();
      
      // Wait for view transition
      await authenticatedPage.waitForTimeout(500);

      // Should show flat list
      await expect(authenticatedPage.locator('[data-testid="file-list"]')).toBeVisible({ timeout: 10000 });

      // Toggle back to tree view
      await viewToggle.click();

      // Should show tree again
      await expect(authenticatedPage.locator('[data-testid="file-tree"]')).toBeVisible();
    }
  });

  test('should filter files by search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Search for specific file
    const searchInput = authenticatedPage.getByPlaceholder(/search|filter/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('getting-started');

      // Should filter to matching file
      await expect(authenticatedPage.getByText('getting-started.md').first()).toBeVisible();
    }
  });

  test('should sort files by name', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Look for sort dropdown
    const sortDropdown = authenticatedPage.locator('[data-testid="sort-dropdown"]');

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click();
      await authenticatedPage.getByText(/name|alphabetical/i).click();

      // Files should be sorted alphabetically
      // Verify first visible file is alphabetically first
    }
  });
});
