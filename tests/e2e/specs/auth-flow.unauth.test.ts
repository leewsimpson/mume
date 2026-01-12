import { test, expect } from '@playwright/test';

/**
 * E2E Tests for US-MVP-001: User authentication via GitHub OAuth
 *
 * Tests the authentication flow for unauthenticated users.
 * These tests run without prior authentication state.
 */

test.describe('US-MVP-001: GitHub OAuth Authentication', () => {
  test('should display login page for unauthenticated users', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/repositories');

    // Should redirect to login page or show login prompt
    await expect(page).toHaveURL(/login/);

    // Verify login page elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
  });

  test('should show "Sign in with GitHub" button on login page', async ({ page }) => {
    await page.goto('/login');

    const githubButton = page.getByRole('button', { name: /sign in with github/i });
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toBeEnabled();
  });

  test('should redirect to GitHub OAuth when clicking sign in', async ({ page }) => {
    await page.goto('/login');

    // Click the GitHub sign in button
    const githubButton = page.getByRole('button', { name: /sign in with github/i });

    // Listen for navigation
    const navigationPromise = page.waitForURL(/github\.com|localhost:3000\/auth\/github/);

    await githubButton.click();

    // Should navigate to GitHub OAuth or our OAuth endpoint
    await navigationPromise;
  });

  test('should not access protected routes without authentication', async ({ page }) => {
    // Try to access repositories page directly
    await page.goto('/repositories');

    // Page should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should not access editor without authentication', async ({ page }) => {
    // Try to access editor page directly
    await page.goto('/repositories/owner/repo/edit/README.md');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should show appropriate error for failed authentication', async ({ page }) => {
    // Navigate to callback with error
    await page.goto('/login?error=access_denied');

    // Should show error message
    await expect(page.getByText(/failed|error|denied/i)).toBeVisible();
  });
});

test.describe('US-MVP-001: Session Management', () => {
  test('should maintain session across page refreshes when authenticated', async ({ browser }) => {
    // Create a new context and authenticate
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login via test endpoint
    await page.request.post('http://localhost:3000/auth/test-login', {
      data: { userId: 1 },
    });

    // Navigate to protected route
    await page.goto('/repositories');
    await expect(page).not.toHaveURL(/login/);

    // Refresh the page
    await page.reload();

    // Should still be authenticated
    await expect(page).not.toHaveURL(/login/);

    await context.close();
  });

  test('should redirect to login after logout', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.request.post('http://localhost:3000/auth/test-login', {
      data: { userId: 1 },
    });

    // Navigate to authenticated page
    await page.goto('/repositories');
    await expect(page).not.toHaveURL(/login/);

    // Logout
    await page.request.get('http://localhost:3000/auth/logout');

    // Navigate to protected route
    await page.goto('/repositories');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);

    await context.close();
  });
});
