import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { TEST_USERS, type MockUser } from '../mocks/github-auth.mock.js';
import { setupGitHubApiMock, resetGitHubApiMockState } from '../mocks/github-api.mock.js';
import { getPool } from './database.fixture.js';

/**
 * Authentication fixture for E2E testing
 *
 * Provides authenticated page contexts for tests without going through
 * the full OAuth flow each time.
 */

// Extend Playwright's test fixtures
export interface AuthFixtures {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
  currentUser: MockUser;
  secondUserPage: Page;
  secondUser: MockUser;
}

/**
 * Create authenticated session via test endpoint
 */
async function createAuthenticatedSession(
  context: BrowserContext,
  user: MockUser
): Promise<void> {
  const page = await context.newPage();

  try {
    // Call the test login endpoint directly
    const response = await page.request.post('http://localhost:3000/auth/test-login', {
      data: { userId: user.id },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to authenticate: ${response.status()}`);
    }

    // Verify authentication worked
    const userResponse = await page.request.get('http://localhost:3000/auth/user');
    if (!userResponse.ok()) {
      throw new Error('Authentication verification failed');
    }
  } finally {
    await page.close();
  }
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Primary authenticated user (Alice)
  currentUser: async ({}, use) => {
    await use(TEST_USERS.alice!);
  },

  // Authenticated browser context
  authenticatedContext: async ({ browser, currentUser }, use) => {
    const context = await browser.newContext();

    try {
      await createAuthenticatedSession(context, currentUser);
      await use(context);
    } finally {
      await context.close();
    }
  },

  // Authenticated page with API mocks
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();

    // Setup API mocks
    await setupGitHubApiMock(page);

    // Reset mock state before each test
    resetGitHubApiMockState();

    await use(page);
  },

  // Secondary user for multi-user tests (Bob)
  secondUser: async ({}, use) => {
    await use(TEST_USERS.bob!);
  },

  // Secondary user's page for collaboration tests
  secondUserPage: async ({ browser, secondUser }, use) => {
    const context = await browser.newContext();

    try {
      await createAuthenticatedSession(context, secondUser);
      const page = await context.newPage();
      await setupGitHubApiMock(page);
      resetGitHubApiMockState();
      await use(page);
    } finally {
      await context.close();
    }
  },
});

/**
 * Helper to verify user is authenticated on a page
 */
export async function verifyAuthenticated(page: Page): Promise<MockUser | null> {
  const response = await page.request.get('http://localhost:3000/auth/user');

  if (!response.ok()) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}

/**
 * Helper to logout user
 */
export async function logout(page: Page): Promise<void> {
  await page.request.post('http://localhost:3000/auth/logout');
}

/**
 * Helper to get user from database
 */
export async function getUserFromDb(userId: number): Promise<any> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

// Re-export expect from base
export { expect } from '@playwright/test';
