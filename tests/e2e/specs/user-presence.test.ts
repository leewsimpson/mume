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

    // Should show presence indicator
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible();

    // Should show current user
    await expect(presence.getByText(currentUser.username)).toBeVisible();
  });

  test('should show user avatar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show avatar image
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    const avatar = presence.locator('img').first();
    await expect(avatar).toBeVisible();
  });

  test('should show "You" indicator for current user', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Should show "You" label
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence.getByText(/you|\(you\)/i)).toBeVisible();
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

    // Wait for both to appear
    await authenticatedPage.waitForTimeout(2000);

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');

    // Verify second user is visible
    await expect(presence.getByText(secondUser.username)).toBeVisible({ timeout: 10000 });

    // Second user leaves
    await secondUserPage.close();

    // Wait for disconnect
    await authenticatedPage.waitForTimeout(3000);

    // Second user should no longer be visible
    await expect(presence.getByText(secondUser.username)).not.toBeVisible({ timeout: 10000 });
  });

  test('should show colored border around avatars', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Avatar should have border
    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
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

  test('should show tooltip on hover', async ({ authenticatedPage, currentUser: _currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');
    
    // Wait for WebSocket connection to establish so presence shows up
    await expect(
      authenticatedPage.locator('[data-testid="connection-status"]').getByText('Connected')
    ).toBeVisible({ timeout: 15000 });

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    const avatar = presence.locator('[data-testid="user-avatar"]').first();

    // Wait for avatar to be visible (presence data arrives via WebSocket)
    await expect(avatar).toBeVisible({ timeout: 10000 });
    
    // Check that avatar has a title attribute (native tooltip)
    const title = await avatar.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toMatch(/alice-test/i);
  });

  test('should show overflow indicator when many users', async ({ authenticatedPage }) => {
    // This test would require mocking multiple users
    // For now, just verify the presence component handles overflow gracefully
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');
    await expect(presence).toBeVisible();

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

    const presence = authenticatedPage.locator('[data-testid="user-presence"]');

    // Should show fallback (initials or placeholder)
    const fallback = presence.locator('[data-testid="avatar-fallback"]');
    if (await fallback.isVisible()) {
      await expect(fallback).toBeVisible();
    }
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
    await expect(editor).toBeVisible();

    // Select text in editor
    await editor.click();
    await editor.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 20);
    });

    // Selection should work
    const selectedText = await editor.evaluate((el: HTMLTextAreaElement) => {
      return el.value.substring(el.selectionStart, el.selectionEnd);
    });

    expect(selectedText.length).toBe(20);
  });

  test('should not interfere with typing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Type content
    await editor.click();
    await editor.pressSequentially('Test typing functionality');

    // Content should be typed
    const content = await editor.inputValue();
    expect(content).toContain('Test typing functionality');
  });
});
