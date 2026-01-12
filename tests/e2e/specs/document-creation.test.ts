import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-002: Create new markdown document
 *
 * Tests the document creation flow including modal, validation, and navigation.
 */

test.describe('US-MVP-002: Document Creation', () => {
  const repoUrl = '/repositories/alice-test/test-docs';

  test('should show "New Document" button in file browser', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Should show new document button
    const newDocButton = authenticatedPage.getByRole('button', { name: /new.*document|create/i });
    await expect(newDocButton).toBeVisible();
    await expect(newDocButton).toBeEnabled();
  });

  test('should open creation modal when clicking "New Document"', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');

    // Click new document button
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    // Modal should appear
    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Should have filename input
    await expect(modal.getByPlaceholder(/filename|name/i)).toBeVisible();
  });

  test('should validate filename requires .md extension', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter filename without .md extension
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('test-file');

    // Try to create
    const createButton = modal.getByRole('button', { name: /create|save/i });
    await createButton.click();

    // Should show validation error
    await expect(modal.getByText(/\.md|extension/i)).toBeVisible();
  });

  test('should show full path preview', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter filename
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('new-file.md');

    // Should show path preview
    await expect(modal.getByText(/new-file\.md/)).toBeVisible();
  });

  test('should allow selecting folder for new document', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Look for folder selector
    const folderSelector = modal.locator('[data-testid="folder-selector"]');

    if (await folderSelector.isVisible()) {
      // Select a folder
      await folderSelector.click();
      await authenticatedPage.getByText('docs').click();

      // Path preview should update
      await expect(modal.getByText(/docs\//)).toBeVisible();
    }
  });

  test('should create document and navigate to editor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter valid filename
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('test-created-file.md');

    // Create document
    const createButton = modal.getByRole('button', { name: /create|save/i });
    await createButton.click();

    // Should navigate to editor
    await expect(authenticatedPage).toHaveURL(/\/edit\/test-created-file\.md$/);
  });

  test('should handle file already exists error (409)', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter filename of existing file
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('README.md');

    // Try to create
    const createButton = modal.getByRole('button', { name: /create|save/i });
    await createButton.click();

    // Should show error
    await expect(modal.getByText(/already exists|conflict/i)).toBeVisible();
  });

  test('should validate filename does not contain invalid characters', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter filename with invalid characters
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('test<file>.md');

    const createButton = modal.getByRole('button', { name: /create|save/i });
    await createButton.click();

    // Should show validation error
    await expect(modal.getByText(/invalid|character/i)).toBeVisible();
  });

  test('should close modal when clicking cancel', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Click cancel
    await modal.getByRole('button', { name: /cancel|close/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test('should allow creating nested folder paths', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(repoUrl);

    await authenticatedPage.waitForSelector('[data-testid="file-tree"]');
    await authenticatedPage.getByRole('button', { name: /new.*document|create/i }).click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Look for text input mode for folder path
    const pathInput = modal.locator('[data-testid="folder-path-input"]');

    if (await pathInput.isVisible()) {
      await pathInput.fill('new-folder/subfolder');

      // Enter filename
      const filenameInput = modal.getByPlaceholder(/filename|name/i);
      await filenameInput.fill('nested-file.md');

      // Path should show full nested path
      await expect(modal.getByText(/new-folder\/subfolder\/nested-file\.md/)).toBeVisible();
    }
  });
});
