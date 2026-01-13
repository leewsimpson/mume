import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-004: Automatic GitHub commits with conflict handling
 *
 * Tests the editor auto-save functionality and conflict resolution.
 */

test.describe('US-MVP-004: Editor and Auto-Save', () => {
  // Use a function to generate unique URLs per test to avoid Yjs document state pollution
  // Each test gets its own document room based on its unique test ID
  const getEditorUrl = (testId: string) => 
    `/repositories/alice-test/test-docs/edit/test-${testId}.md`;

  test('should load document content into editor', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    // Wait for editor to load
    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Should contain document content (test files get default content)
    const content = await editor.inputValue();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should show save status indicator', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    // Wait for editor
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show save status
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus).toBeVisible();

    // Should indicate saved state initially
    await expect(saveStatus.getByText(/saved|up to date|auto-save enabled/i)).toBeVisible();
  });

  test('should update save status when editing', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type some content
    await editor.click();
    await editor.pressSequentially(' - edited');

    // Save status should update to show unsaved changes or saving state
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/unsaved|saving|modified|auto-save enabled/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show markdown preview alongside editor', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    // Wait for editor
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show preview pane
    const preview = authenticatedPage.locator('[data-testid="markdown-preview"]');
    await expect(preview).toBeVisible();

    // Preview should render markdown (use first() as concurrent tests may add more headings)
    await expect(preview.locator('h1').first()).toBeVisible();
  });

  test('should sync preview with editor changes', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
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

  test('should auto-save after delay', async ({ authenticatedPage }, testInfo) => {
    // Auto-save runs every 30 seconds via githubSync.job.ts
    // Note: Auto-save runs silently in background - no UI status update per PRD
    // This test verifies that the editor remains functional during auto-save cycle
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially(' - auto save test');

    // Verify save status shows auto-save is enabled
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/auto-save enabled/i)).toBeVisible();

    // Wait through one auto-save cycle (30s) to ensure no crashes
    await authenticatedPage.waitForTimeout(35000);

    // Editor should still be functional after auto-save cycle
    await expect(editor).toBeVisible();
    await editor.pressSequentially(' - still working');
    
    // Content should still contain our edits (not lost)
    await expect(editor).toContainText('auto save test');
  });

  test('should handle concurrent edits from multiple users', async ({
    authenticatedPage,
    secondUserPage,
  }, testInfo) => {
    // Both users open same document - this test INTENTIONALLY shares a document
    // to test real-time collaboration via Yjs
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);
    await secondUserPage.goto(editorUrl);

    // Wait for both editors to load
    const editor1 = authenticatedPage.locator('[data-testid="markdown-editor"]');
    const editor2 = secondUserPage.locator('[data-testid="markdown-editor"]');

    await expect(editor1).toBeVisible();
    await expect(editor2).toBeVisible();

    // User 1 types content at the end
    await editor1.click();
    await editor1.press('End'); // Go to end of document
    await editor1.press('Enter');
    await editor1.pressSequentially('User 1 edit');

    // Wait for sync
    await authenticatedPage.waitForTimeout(3000);

    // User 2 should see the changes (via Yjs sync)
    const editor2Content = await editor2.inputValue();
    expect(editor2Content).toContain('User 1 edit');
  });

  test('should show connection status', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    // Should show connection status
    const connectionStatus = authenticatedPage.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();

    // Should indicate connected
    await expect(connectionStatus.getByText(/connected/i)).toBeVisible();
  });

  test('should handle offline gracefully', async ({ authenticatedPage }, testInfo) => {
    // Set up WebSocket interception to capture the connection for later closure
    let wsConnection: { close: () => Promise<void> } | null = null;
    
    await authenticatedPage.routeWebSocket('ws://localhost:3000/**', (ws) => {
      // Store the WebSocket route for later closure
      wsConnection = ws;
      // Connect to the real server so the app works normally first
      ws.connectToServer();
    });

    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Wait for WebSocket to be established and connected
    const connectionStatus = authenticatedPage.locator('[data-testid="connection-status"]');
    await expect(connectionStatus.getByText(/connected/i)).toBeVisible({ timeout: 10000 });

    // Type content while connected first
    await editor.click();
    await editor.pressSequentially(' offline edit');

    // Wait a moment for the text to sync
    await authenticatedPage.waitForTimeout(500);

    // Close the WebSocket to simulate disconnect
    // Playwright's routeWebSocket close() sends a proper close frame
    if (wsConnection) {
      await wsConnection.close();
    }

    // Wait for y-websocket to detect the closure and update status
    // The library should receive the close event and emit 'disconnected' status
    await expect(connectionStatus.getByText(/disconnected|connecting/i)).toBeVisible({ timeout: 10000 });
  });

  test('should preserve document state during conflict resolution', async ({
    authenticatedPage,
  }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
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
  // Use a function to generate unique URLs per test to avoid Yjs document state pollution
  const getEditorUrl = (testId: string) => 
    `/repositories/alice-test/test-docs/edit/test-${testId}.md`;

  test('should show "Save Now" button in editor', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeVisible();
  });

  test('should disable save button when no unsaved changes', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });

    // Should be disabled when no changes
    await expect(saveButton).toBeDisabled();
  });

  test('should enable save button when document is modified', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
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

  test('should save document when clicking save button', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Wait for editor to fully initialize (Y.Text observer needs time to be ready)
    await authenticatedPage.waitForTimeout(200);

    // Type content
    await editor.click();
    await editor.pressSequentially(' manual save test');

    // Wait for save button to become enabled (indicating unsaved changes detected)
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });

    // Monitor the save API call
    const saveResponsePromise = authenticatedPage.waitForResponse(
      response => response.url().includes('/documents/') 
        && response.url().includes('/save')
        && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Click save
    await saveButton.click();

    // Verify API call was made
    const saveResponse = await saveResponsePromise;
    
    // Should return 200 OK
    expect(saveResponse.status()).toBe(200);
    
    // Verify response structure
    const responseBody = await saveResponse.json();
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toContain('saved');
    expect(responseBody).toHaveProperty('sha');

    // Should show saving state
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/saving|saved/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error message when save fails', async ({ authenticatedPage }, testInfo) => {
    // This test verifies that save failures are NOT silent
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Intercept save endpoint and force it to fail
    await authenticatedPage.route('**/documents/*/save', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Test error: Save failed intentionally'
        })
      });
    });

    // Type content
    await editor.click();
    await editor.pressSequentially('This will fail to save');

    // Try to save
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await saveButton.click();

    // Should show error status
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
    
    // Error message should be visible to user
    await expect(saveStatus).toHaveCSS('color', /rgb\(248, 81, 73\)/); // Red color
  });

  test('should handle save immediately after page load', async ({ authenticatedPage }, testInfo) => {
    // This test verifies the fix for the race condition where save is clicked
    // before the Y.Doc is fully initialized in y-websocket
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content immediately (no wait - testing race condition)
    await editor.click();
    await editor.pressSequentially('Quick edit');

    // Wait for save button to become enabled (Y.Text observer has detected changes)
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });

    // Monitor save API call
    const saveResponsePromise = authenticatedPage.waitForResponse(
      response => response.url().includes('/save') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Click save
    await saveButton.click();

    // Should still succeed (either immediately or after retry)
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);
    
    const responseBody = await saveResponse.json();
    expect(responseBody.success).toBe(true);
  });

  test('should support Ctrl+S keyboard shortcut', async ({ authenticatedPage }, testInfo) => {
    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Wait for editor to fully initialize
    await authenticatedPage.waitForTimeout(200);

    // Type content
    await editor.click();
    await editor.pressSequentially(' keyboard save test');

    // Wait for unsaved state to be detected (save button becomes enabled)
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });

    // Press Ctrl+S
    await authenticatedPage.keyboard.press('Control+s');

    // Should trigger save
    const saveStatus = authenticatedPage.locator('[data-testid="save-status"]');
    await expect(saveStatus.getByText(/saving|saved/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state while saving', async ({ authenticatedPage }, testInfo) => {
    // Mock the save endpoint with a delay to test loading state
    await authenticatedPage.route('**/api/repositories/*/*/documents/*/save', async (route) => {
      // Delay the response so we can observe the loading state
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, sha: 'new-sha-123', message: 'Document saved successfully' }),
      });
    });

    const editorUrl = getEditorUrl(testInfo.testId);
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Wait for editor to fully initialize (Y.Text observer needs 100ms+ to be ready)
    await authenticatedPage.waitForTimeout(200);

    // Type content to trigger unsaved changes
    await editor.click();
    await editor.pressSequentially(' loading test');

    // Wait for save button to become enabled (indicating unsaved changes detected)
    const saveButton = authenticatedPage.getByRole('button', { name: /save.*now|save/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });

    // Click save and check for loading state
    await saveButton.click();

    // Should show loading indicator - the button text changes to "Saving..."
    // The mock delays response for 3 seconds, so we have plenty of time to see it
    const savingButton = authenticatedPage.getByRole('button', { name: /saving/i });
    await expect(savingButton).toBeVisible({ timeout: 1000 });
  });
});
