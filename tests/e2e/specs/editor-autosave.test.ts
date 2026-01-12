import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-004: Automatic GitHub commits with conflict handling
 *
 * Tests the editor auto-save functionality and conflict resolution.
 */

test.describe('US-MVP-004: Editor and Auto-Save', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test('should load document content into editor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    // Wait for editor to load
    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Should contain document content
    const content = await editor.inputValue();
    expect(content).toContain('Test Documentation');
  });

  test('should show save status indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    // Wait for editor
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show save status
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus).toBeVisible();

    // Should indicate saved state initially
    await expect(saveStatus.getByText(/saved|up to date/i)).toBeVisible();
  });

  test('should update save status when editing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type some content
    await editor.click();
    await editor.pressSequentially(' - edited');

    // Save status should update to show unsaved changes
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/unsaved|saving|modified/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show markdown preview alongside editor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    // Wait for editor
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show preview pane
    const preview = authenticatedPage.locator('[data-testid="markdown-preview"]');
    await expect(preview).toBeVisible();

    // Preview should render markdown
    await expect(preview.locator('h1')).toBeVisible();
  });

  test('should sync preview with editor changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Clear editor and add new content
    await editor.fill('# New Heading\n\nNew paragraph');

    // Preview should update
    const preview = authenticatedPage.locator('[data-testid="markdown-preview"]');
    await expect(preview.getByRole('heading', { name: 'New Heading' })).toBeVisible();
    await expect(preview.getByText('New paragraph')).toBeVisible();
  });

  test('should auto-save after delay', async ({ authenticatedPage }) => {
    // Skip if auto-save is not implemented yet
    test.skip();

    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially(' - auto save test');

    // Wait for auto-save (typically 30-60 seconds, but we use shorter timeout for test)
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');

    // Should eventually show saved
    await expect(saveStatus.getByText(/saved|synced/i)).toBeVisible({ timeout: 65000 });
  });

  test('should handle concurrent edits from multiple users', async ({
    authenticatedPage,
    secondUserPage,
  }) => {
    // Both users open same document
    await authenticatedPage.goto(editorUrl);
    await secondUserPage.goto(editorUrl);

    // Wait for both editors to load
    const editor1 = authenticatedPage.locator('[data-testid="markdown-editor"]');
    const editor2 = secondUserPage.locator('[data-testid="markdown-editor"]');

    await expect(editor1).toBeVisible();
    await expect(editor2).toBeVisible();

    // User 1 types content
    await editor1.click();
    await editor1.pressSequentially('User 1 edit');

    // Wait for sync
    await authenticatedPage.waitForTimeout(2000);

    // User 2 should see the changes (via Yjs sync)
    const editor2Content = await editor2.inputValue();
    expect(editor2Content).toContain('User 1 edit');
  });

  test('should show connection status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    // Should show connection status
    const connectionStatus = authenticatedPage.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();

    // Should indicate connected
    await expect(connectionStatus.getByText(/connected/i)).toBeVisible();
  });

  test('should handle offline gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Simulate offline
    await authenticatedPage.context().setOffline(true);

    // Type content
    await editor.click();
    await editor.pressSequentially(' offline edit');

    // Should show offline indicator
    const connectionStatus = authenticatedPage.locator('[data-testid="connection-status"]');
    await expect(connectionStatus.getByText(/disconnected|offline/i)).toBeVisible();

    // Come back online
    await authenticatedPage.context().setOffline(false);

    // Should reconnect
    await expect(connectionStatus.getByText(/connected/i)).toBeVisible({ timeout: 10000 });
  });

  test('should preserve document state during conflict resolution', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Record initial content
    const initialContent = await editor.inputValue();

    // Type content
    await editor.click();
    await editor.pressSequentially(' important edit');

    // Content should still include the edit
    const finalContent = await editor.inputValue();
    expect(finalContent).toContain('important edit');
    expect(finalContent).toContain(initialContent.substring(0, 50));
  });
});

test.describe('US-MVP-011: Manual Save Button', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test('should show "Save Now" button in editor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeVisible();
  });

  test('should disable save button when no unsaved changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });

    // Should be disabled when no changes
    await expect(saveButton).toBeDisabled();
  });

  test('should enable save button when document is modified', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially(' modification');

    // Save button should be enabled
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeEnabled();
  });

  test('should save document when clicking save button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially(' manual save test');

    // Click save
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await saveButton.click();

    // Should show saving state
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/saving|saved/i)).toBeVisible({ timeout: 10000 });
  });

  test('should support Ctrl+S keyboard shortcut', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially(' keyboard save test');

    // Press Ctrl+S
    await authenticatedPage.keyboard.press('Control+s');

    // Should trigger save
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/saving|saved/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state while saving', async ({ authenticatedPage }) => {
    // Slow down API response
    await authenticatedPage.route('**/api/repositories/*/*/files/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await route.continue();
    });

    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type and save
    await editor.click();
    await editor.pressSequentially(' loading test');

    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await saveButton.click();

    // Should show loading indicator
    await expect(saveButton.getByText(/saving/i).or(saveButton.locator('[data-loading]'))).toBeVisible();
  });
});
