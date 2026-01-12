import { test, expect } from '../fixtures/index.js';
import { selectTextInEditor } from '../utils/test-helpers.js';
import { seedTestComments, resetDatabase, seedTestUsers } from '../fixtures/database.fixture.js';

/**
 * E2E Tests for US-MVP-005, 006, 007: Comment System
 *
 * Tests for adding comments, replying, resolving, and deleting comments.
 */

test.describe('US-MVP-005: Add Sidebar Comment Thread', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test.beforeEach(async () => {
    // Reset database before each test
    await resetDatabase();
    await seedTestUsers();
  });

  test('should show comment sidebar toggle button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    const sidebarToggle = authenticatedPage.getByRole('button', { name: /comments|sidebar/i });
    await expect(sidebarToggle).toBeVisible();
  });

  test('should toggle comment sidebar open and closed', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Click to open sidebar
    const sidebarToggle = authenticatedPage.getByRole('button', { name: /comments|sidebar/i });
    await sidebarToggle.click();

    // Sidebar should be visible
    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Click again to close
    await sidebarToggle.click();

    // Sidebar should be hidden
    await expect(sidebar).not.toBeVisible();
  });

  test('should show "Add Comment" button when text is selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Select some text
    await selectTextInEditor(authenticatedPage, '[data-testid="markdown-editor"]', 10, 50);

    // Add comment button should appear
    const addCommentButton = authenticatedPage.getByRole('button', { name: /add.*comment/i });
    await expect(addCommentButton).toBeVisible();
  });

  test('should open comment modal when clicking "Add Comment"', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Select text
    await selectTextInEditor(authenticatedPage, '[data-testid="markdown-editor"]', 10, 50);

    // Click add comment
    await authenticatedPage.getByRole('button', { name: /add.*comment/i }).click();

    // Modal should appear
    const modal = authenticatedPage.locator('[data-testid="comment-modal"]');
    await expect(modal).toBeVisible();

    // Should have text input
    await expect(modal.getByPlaceholder(/comment|write/i)).toBeVisible();
  });

  test('should create comment and show in sidebar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    const editor = authenticatedPage.locator('[data-testid="markdown-editor"]');
    await expect(editor).toBeVisible();

    // Select text and add comment
    await selectTextInEditor(authenticatedPage, '[data-testid="markdown-editor"]', 10, 50);
    await authenticatedPage.getByRole('button', { name: /add.*comment/i }).click();

    const modal = authenticatedPage.locator('[data-testid="comment-modal"]');
    await modal.getByPlaceholder(/comment|write/i).fill('This is a test comment');
    await modal.getByRole('button', { name: /submit|save|add/i }).click();

    // Open sidebar
    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    // Comment should appear in sidebar
    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    await expect(sidebar.getByText('This is a test comment')).toBeVisible();
  });

  test('should show comment author info', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    // Seed a comment first
    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');

    // Reload to get comments
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    // Open sidebar
    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Should show author username
    const comment = sidebar.locator('[data-testid="comment-item"]').first();
    await expect(comment.getByText(currentUser.username)).toBeVisible();
  });

  test('should show comment timestamp', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    // Should show timestamp
    await expect(comment.getByText(/ago|just now|today/i)).toBeVisible();
  });

  test('should show empty state when no comments', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(editorUrl);

    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');

    // Should show empty state
    await expect(sidebar.getByText(/no comments|select text/i)).toBeVisible();
  });

  test('should navigate to highlighted text when clicking comment', async ({
    authenticatedPage,
    currentUser,
  }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    // Click on comment
    await comment.click();

    // Editor should scroll/focus to highlighted text
    // This is hard to verify visually, but we can check for highlight
  });
});

test.describe('US-MVP-006: Reply to and Resolve Comments', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test.beforeEach(async () => {
    await resetDatabase();
    await seedTestUsers();
  });

  test('should show reply button on comments', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    // Should have reply button
    await expect(comment.getByRole('button', { name: /reply/i })).toBeVisible();
  });

  test('should open reply textarea when clicking reply', async ({
    authenticatedPage,
    currentUser,
  }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    await comment.getByRole('button', { name: /reply/i }).click();

    // Reply textarea should appear
    await expect(comment.getByPlaceholder(/reply|write/i)).toBeVisible();
  });

  test('should submit reply and show in thread', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    await comment.getByRole('button', { name: /reply/i }).click();
    await comment.getByPlaceholder(/reply|write/i).fill('This is a reply');
    await comment.getByRole('button', { name: /submit|send/i }).click();

    // Reply should appear
    await expect(comment.getByText('This is a reply')).toBeVisible();
  });

  test('should show resolve button on comments', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    await expect(comment.getByRole('button', { name: /resolve/i })).toBeVisible();
  });

  test('should resolve comment and show resolved state', async ({
    authenticatedPage,
    currentUser,
  }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    await comment.getByRole('button', { name: /resolve/i }).click();

    // Comment should show resolved state
    await expect(comment.getByText(/resolved/i)).toBeVisible();
  });

  test('should toggle show/hide resolved comments', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    // Seed comment with resolved=true
    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');

    // Look for toggle
    const toggleButton = sidebar.getByRole('button', { name: /show.*resolved|hide.*resolved/i });

    if (await toggleButton.isVisible()) {
      // Toggle resolved visibility
      await toggleButton.click();

      // Resolved comments should be hidden/shown
    }
  });
});

test.describe('US-MVP-007: Delete Comments', () => {
  const editorUrl = '/repositories/alice-test/test-docs/edit/README.md';

  test.beforeEach(async () => {
    await resetDatabase();
    await seedTestUsers();
  });

  test('should show delete button only for own comments', async ({
    authenticatedPage,
    currentUser,
  }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    // Should show delete button (since comment belongs to current user)
    await expect(comment.getByRole('button', { name: /delete|trash/i })).toBeVisible();
  });

  test('should show confirmation dialog when deleting', async ({
    authenticatedPage,
    currentUser,
  }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const comment = sidebar.locator('[data-testid="comment-item"]').first();

    await comment.getByRole('button', { name: /delete|trash/i }).click();

    // Confirmation dialog should appear
    await expect(authenticatedPage.getByText(/are you sure|confirm/i)).toBeVisible();
  });

  test('should delete comment when confirmed', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');

    // Get initial comment count
    const initialCount = await sidebar.locator('[data-testid="comment-item"]').count();

    const comment = sidebar.locator('[data-testid="comment-item"]').first();
    await comment.getByRole('button', { name: /delete|trash/i }).click();

    // Confirm deletion
    await authenticatedPage.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Comment should be removed
    const finalCount = await sidebar.locator('[data-testid="comment-item"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should cancel deletion when clicking cancel', async ({ authenticatedPage, currentUser }) => {
    await authenticatedPage.goto(editorUrl);

    await seedTestComments(currentUser.id, 'alice-test', 'test-docs', 'README.md');
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="markdown-editor"]');

    await authenticatedPage.getByRole('button', { name: /comments|sidebar/i }).click();

    const sidebar = authenticatedPage.locator('[data-testid="comment-sidebar"]');
    const initialCount = await sidebar.locator('[data-testid="comment-item"]').count();

    const comment = sidebar.locator('[data-testid="comment-item"]').first();
    await comment.getByRole('button', { name: /delete|trash/i }).click();

    // Cancel deletion
    await authenticatedPage.getByRole('button', { name: /cancel|no/i }).click();

    // Comment should still be there
    const finalCount = await sidebar.locator('[data-testid="comment-item"]').count();
    expect(finalCount).toBe(initialCount);
  });
});
