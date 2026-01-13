import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { TEST_USERS, type MockUser } from '../mocks/github-auth.mock.js';
import { setupGitHubApiMockOnContext, resetGitHubApiMockState } from '../mocks/github-api.mock.js';
import { getUserById } from './redis.fixture.js';

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
 * Includes retry logic for transient failures (race conditions with Redis seeding)
 */
async function createAuthenticatedSession(
  context: BrowserContext,
  user: MockUser,
  maxRetries: number = 3
): Promise<void> {
  const page = await context.newPage();

  try {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Call the test login endpoint directly
        const response = await page.request.post('http://localhost:3000/auth/test-login', {
          data: { userId: user.id },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok()) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to authenticate: ${response.status()} - ${errorBody}`);
        }

        // Verify authentication worked
        const userResponse = await page.request.get('http://localhost:3000/auth/user');
        if (!userResponse.ok()) {
          throw new Error('Authentication verification failed');
        }
        
        // Success - exit the retry loop
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
          const delay = 500 * Math.pow(2, attempt - 1);
          console.warn(`Auth attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('Authentication failed after all retries');
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
      // Setup API mocks at context level BEFORE authentication
      // This ensures route interception works for both page requests and context.request API calls
      await setupGitHubApiMockOnContext(context);

      await createAuthenticatedSession(context, currentUser);
      await use(context);
    } finally {
      await context.close();
    }
  },

  // Authenticated page with API mocks
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();

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
      // Setup API mocks at context level
      await setupGitHubApiMockOnContext(context);

      await createAuthenticatedSession(context, secondUser);
      const page = await context.newPage();
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
 * Helper to get user from Redis
 */
export async function getUserFromRedis(userId: number): Promise<any> {
  return getUserById(userId);
}

// Re-export expect from base
export { expect } from '@playwright/test';
