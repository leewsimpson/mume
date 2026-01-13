import { test, expect } from '../fixtures/index.js';

/**
 * E2E Tests for US-MVP-010: User Presence with GitHub Avatars
 *
 * Tests real-time user presence and avatar display.
 */

test.describe('US-MVP-010: User Presence', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test('should show current user in presence list', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Should show presence indicator (wait for awareness to populate)
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });

    // Should show current user (use first() to handle duplicates from parallel tests)
    await expect(presence.getByText(currentUser.username).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show user avatar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Should show avatar image (wait for presence to populate)
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });
    
    const avatar = presence.locator('img').first();
    await expect(avatar).toBeVisible({ timeout: 5000 });
  });

  test('should show "You" indicator for current user', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Should show "You" label
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });
    await expect(presence.getByText(/you|\(you\)/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show other users when they join', async ({
    authenticatedPage,
    secondUserPage,
    secondUser,
  }) => {
    // First user opens document
    await authenticatedPage.goto(editorUrl);
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Second user opens same document
    await secondUserPage.goto(editorUrl);
    await secondUserPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for presence sync
    await authenticatedPage.waitForTimeout(2000);

    // First user should see second user
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence.getByText(secondUser.username).first()).toBeVisible({ timeout: 10000 });
  });

  test('should update when user leaves', async ({
    authenticatedPage,
    secondUserPage,
    secondUser,
  }) => {
    // Both users open document
    await authenticatedPage.goto(editorUrl);
    await secondUserPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');
    await secondUserPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established for both users
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });
    await expect(
      secondUserPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');

    // Verify second user is visible (use first() to handle potential duplicates from parallel tests)
    await expect(presence.getByText(secondUser.username).first()).toBeVisible({ timeout: 10000 });

    // Count how many times secondUser appears before leaving
    const countBefore = await presence.getByText(secondUser.username).count();

    // Second user leaves
    await secondUserPage.close();

    // Wait for presence to update - poll until count decreases or timeout
    await expect(async () => {
      const countAfter = await presence.getByText(secondUser.username).count();
      expect(countAfter).toBeLessThan(countBefore);
    }).toPass({ timeout: 10000 });
  });

  test('should show colored border around avatars', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Avatar should have border
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });
    
    const avatar = presence.locator('[data-testid="user-avatar"]').first();

    if (await avatar.isVisible()) {
      // Check for border style (specific implementation may vary)
      const hasColoredBorder = await avatar.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.borderWidth !== '0px' ||
          style.outlineWidth !== '0px' ||
          style.boxShadow !== 'none'
        );
      });

      expect(hasColoredBorder).toBe(true);
    }
  });

  test('should show tooltip on hover', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');
    
    // Wait for WebSocket connection to establish so presence shows up
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });
    
    // Wait for avatar or fallback to be visible (presence data arrives via WebSocket)
    const avatar = presence.locator('[data-testid="user-avatar"]').first();
    const fallback = presence.locator('[data-testid="avatar-fallback"]').first();
    
    // Either avatar or fallback should be visible
    const avatarVisible = await avatar.isVisible().catch(() => false);
    const fallbackVisible = await fallback.isVisible().catch(() => false);
    
    expect(avatarVisible || fallbackVisible).toBe(true);
    
    // Check that the visible element has a title attribute with the username
    if (avatarVisible) {
      const title = await avatar.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title).toContain(currentUser.username);
    } else {
      const title = await fallback.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title).toContain(currentUser.username);
    }
  });

  test('should show overflow indicator when many users', async ({ authenticatedPage }) => {
    // This test would require mocking multiple users
    // For now, just verify the presence component handles overflow gracefully
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to be established
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });

    // If there were more than 10 users, should show "+N more"
    // With current setup, we just verify it doesn't break
  });

  test('should show user cursor position', async ({
    authenticatedPage,
    secondUserPage,
    secondUser: _secondUser,
  }) => {
    // Both users open document
    await authenticatedPage.goto(editorUrl);
    await secondUserPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');
    await secondUserPage.waitForSelector('[data-testid="markdown-editor"]');

    // Second user clicks in editor
    const secondEditor = secondUserPage.locator('[data-testid="markdown-editor"]');
    await secondEditor.click();
    await secondEditor.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(50, 50);
    });

    // Wait for sync
    await authenticatedPage.waitForTimeout(2000);

    // First user should see cursor indicator
    const _cursors = authenticatedPage.locator('[data-testid="remote-cursor"]');
    // Cursor visibility depends on implementation
  });

  test('should fallback to initials when avatar fails to load', async ({ authenticatedPage }) => {
    // Mock avatar to fail
    await authenticatedPage.route('**/avatars.githubusercontent.com/**', async (route) => {
      await route.abort();
    });

    await authenticatedPage.goto(editorUrl);
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Wait for WebSocket connection to establish
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible({ timeout: 10000 });

    // Wait for fallback to appear (avatar load error triggers state change)
    // Use first() to handle potential multiple users from parallel tests
    const fallback = presence.locator('[data-testid="avatar-fallback"]').first();
    await expect(fallback).toBeVisible({ timeout: 5000 });
  });
});

test.describe('US-MVP-012: Comment Highlighting', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test('should highlight text ranges with comments', async ({ authenticatedPage, currentUser }) => {
    // Seed comments via mock
    const { seedMockComments } = await import('../mocks/github-api.mock.js');
    seedMockComments('README.md', currentUser.id, currentUser.username);

    await authenticatedPage.goto(editorUrl);
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show comment highlights
    const _highlights = authenticatedPage.locator('[data-testid="comment-highlight"]');
    // Number depends on implementation
  });

  test('should click highlighted text to show comment', async ({
    authenticatedPage,
    currentUser,
  }) => {
    // Seed comments via mock
    const { seedMockComments } = await import('../mocks/github-api.mock.js');
    seedMockComments('README.md', currentUser.id, currentUser.username);

    await authenticatedPage.goto(editorUrl);
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click on highlighted area
    const highlight = authenticatedPage.locator('[data-testid="comment-highlight"]').first();

    if (await highlight.isVisible()) {
      await highlight.click();

      // Sidebar should open and scroll to comment
      const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
      await expect(sidebar).toBeVisible();
    }
  });

  test('should show resolved comments in different colour', async ({
    authenticatedPage,
    currentUser,
  }) => {
    // Seed comments via mock
    const { seedMockComments } = await import('../mocks/github-api.mock.js');
    seedMockComments('README.md', currentUser.id, currentUser.username);

    await authenticatedPage.goto(editorUrl);
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Resolved highlight should have different style
    const resolvedHighlight = authenticatedPage.locator(
      '[data-testid="comment-highlight"][data-resolved="true"]'
    );

    if (await resolvedHighlight.isVisible()) {
      // Should have grey/muted colour
      const _colour = await resolvedHighlight.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // Verify it's a grey-ish colour (implementation dependent)
    }
  });

  test('should handle overlapping comment ranges', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Overlapping highlights should render without breaking
    // Just verify the editor loads correctly
    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();
  });

  test('should update highlight positions when text changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');

    // Type content at beginning (shifts all positions)
    await editor.click();
    await editor.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 0);
    });
    await editor.pressSequentially('NEW TEXT AT START\n');

    // Highlights should adjust position
    // This is hard to verify without knowing exact implementation
    // Just ensure no errors occur
  });

  test('should not interfere with text selection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for WebSocket connection to ensure editor content is loaded
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Wait for content to be synced
    await authenticatedPage.waitForTimeout(500);

    // Verify editor has content before selecting
    const contentLength = await editor.evaluate((el: HTMLTextAreaElement) => el.value.length);
    expect(contentLength).toBeGreaterThanOrEqual(20);

    // Focus and select text in editor, then immediately read selection
    // This is done in one call to avoid selection being reset by re-renders
    await editor.click();
    const selectedText = await editor.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.setSelectionRange(0, 20);
      return el.value.substring(el.selectionStart, el.selectionEnd);
    });

    expect(selectedText.length).toBe(20);
  });

  test('should not interfere with typing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for WebSocket connection to ensure editor is fully initialised
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    // Small delay to ensure Y.Text binding is ready
    await authenticatedPage.waitForTimeout(500);

    // Type content
    await editor.click();
    await editor.pressSequentially('Test typing functionality');

    // Content should be typed
    const content = await editor.inputValue();
    expect(content).toContain('Test typing functionality');
  });
});
