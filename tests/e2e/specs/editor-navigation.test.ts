import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-013: Editor toolbar navigation
 * E2E Tests for US-MVP-014: Create new document from editor
 *
 * Tests navigation from editor back to document browser and creating new documents from within the editor.
 */

test.describe('US-MVP-013: Editor Toolbar Navigation', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';
  const nestedEditorUrl = '/repositories/alice-test/test-docs/edit/docs%2Fgetting-started.md';
  const repoUrl = '/repositories/alice-test/test-docs';

  test('should show Back/Files button in editor toolbar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show back/files button
    const backButton = authenticatedPage.getByRole('button', { name: /files|back|browse/i });
    await expect(backButton).toBeVisible();
  });

  test('should navigate to document browser when clicking Back button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click back button
    const backButton = authenticatedPage.getByRole('button', { name: /files|back|browse/i });
    await backButton.click();

    // Should navigate to document browser
    await expect(authenticatedPage).toHaveURL(repoUrl);
    await expect(authenticatedPage.locator('[data-testid="file-tree"]')).toBeVisible();
  });

  test('should show clickable breadcrumb path in editor header', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(nestedEditorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show breadcrumb with repo name
    const breadcrumb = authenticatedPage.locator('[data-testid="editor-breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    // Should contain clickable repository segment
    await expect(breadcrumb.getByText(/alice-test\/test-docs|test-docs/i)).toBeVisible();
  });

  test('should navigate to document browser when clicking repository breadcrumb', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(nestedEditorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click repository segment in breadcrumb
    const breadcrumb = authenticatedPage.locator('[data-testid="editor-breadcrumb"]');
    const repoLink = breadcrumb.getByRole('button', { name: /test-docs/i }).first();
    await repoLink.click();

    // Should navigate to document browser
    await expect(authenticatedPage).toHaveURL(repoUrl);
  });

  test('should show confirmation dialog when navigating away with unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Make changes
    await editor.click();
    await editor.pressSequentially(' unsaved change');

    // Wait for unsaved state to be detected
    await authenticatedPage.waitForTimeout(200);

    // Set up dialog handler
    authenticatedPage.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toMatch(/unsaved|changes|leave/i);
      await dialog.dismiss(); // Stay on page
    });

    // Try to navigate away
    const backButton = authenticatedPage.getByRole('button', { name: /files|back|browse/i });
    await backButton.click();

    // Should still be on editor (dialog was dismissed)
    await expect(authenticatedPage).toHaveURL(editorUrl);
  });

  test('should navigate away when confirming leave with unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Make changes
    await editor.click();
    await editor.pressSequentially(' unsaved change to leave');

    // Wait for unsaved state to be detected
    await authenticatedPage.waitForTimeout(200);

    // Set up dialog handler - accept this time
    authenticatedPage.once('dialog', async dialog => {
      await dialog.accept(); // Leave page
    });

    // Try to navigate away
    const backButton = authenticatedPage.getByRole('button', { name: /files|back|browse/i });
    await backButton.click();

    // Should navigate to document browser
    await expect(authenticatedPage).toHaveURL(repoUrl);
  });

  test('should navigate without confirmation when no unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Don't make any changes - just navigate
    const backButton = authenticatedPage.getByRole('button', { name: /files|back|browse/i });
    await backButton.click();

    // Should navigate directly without dialog
    await expect(authenticatedPage).toHaveURL(repoUrl);
  });

  test('should navigate to document browser on Escape key press', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Press Escape key
    await authenticatedPage.keyboard.press('Escape');

    // Should navigate to document browser
    await expect(authenticatedPage).toHaveURL(repoUrl);
  });

  test('should show confirmation on Escape key with unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Make changes
    await editor.click();
    await editor.pressSequentially(' escape test change');

    // Wait for unsaved state
    await authenticatedPage.waitForTimeout(200);

    // Set up dialog handler
    authenticatedPage.once('dialog', async dialog => {
      await dialog.dismiss(); // Stay on page
    });

    // Press Escape
    await authenticatedPage.keyboard.press('Escape');

    // Should still be on editor
    await expect(authenticatedPage).toHaveURL(editorUrl);
  });
});

test.describe('US-MVP-014: Create New Document from Editor', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';
  const nestedEditorUrl = '/repositories/alice-test/test-docs/edit/docs%2Fgetting-started.md';

  test('should show New Document button in editor toolbar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show new document button in editor header (not the modal button)
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await expect(newButton).toBeVisible();
  });

  test('should open CreateDocumentModal when clicking New button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click new document button in editor header
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await newButton.click();

    // Modal should appear
    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should pre-fill folder path with current document folder', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(nestedEditorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click new document button in editor header
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await newButton.click();

    // Modal should show with pre-filled folder
    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Folder path should be pre-filled to 'docs' - check the input value or text mode display
    // The modal opens in text mode when initialFolderPath is provided
    const folderInput = modal.locator('[data-testid="folder-path-input"]');
    await expect(folderInput).toHaveValue('docs');
  });

  test('should create document and navigate to new file', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click new document button in editor header
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await newButton.click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Enter filename
    const filenameInput = modal.getByPlaceholder(/filename|name/i);
    await filenameInput.fill('new-from-editor.md');

    // Create document - use the modal's Create Document button
    const createButton = modal.getByRole('button', { name: /create document/i });
    await createButton.click();

    // Should navigate to new document in editor
    await expect(authenticatedPage).toHaveURL(/\/edit\/new-from-editor\.md$/);
  });

  test('should open modal with Ctrl+N keyboard shortcut', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Press Ctrl+N
    await authenticatedPage.keyboard.press('Control+n');

    // Modal should appear
    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should show confirmation when creating new document with unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Make changes
    await editor.click();
    await editor.pressSequentially(' unsaved before new doc');

    // Wait for unsaved state
    await authenticatedPage.waitForTimeout(200);

    // Set up dialog handler
    authenticatedPage.once('dialog', async dialog => {
      expect(dialog.message()).toMatch(/unsaved|changes|leave/i);
      await dialog.dismiss(); // Stay on page
    });

    // Click new document button in editor header
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await newButton.click();

    // Modal should NOT appear (dialog was dismissed)
    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking cancel', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click new document button in editor header
    const editorHeader = authenticatedPage.locator('.editor-header');
    const newButton = editorHeader.getByRole('button', { name: /new/i });
    await newButton.click();

    const modal = authenticatedPage.locator('[data-testid="create-document-modal"]');
    await expect(modal).toBeVisible();

    // Click cancel
    await modal.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Should still be on same editor page
    await expect(authenticatedPage).toHaveURL(editorUrl);
  });
});
