import type { Page, Route } from '@playwright/test';

/**
 * Mock GitHub OAuth flow for E2E testing
 *
 * This mock intercepts GitHub OAuth requests and simulates the authentication
 * flow without actually contacting GitHub's servers.
 */

export interface MockUser {
  id: number;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
}

// Default test users
export const TEST_USERS: Record<string, MockUser> = {
  alice: {
    id: 1,
    githubId: '12345',
    username: 'alice-test',
    email: 'alice@test.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345?v=4',
  },
  bob: {
    id: 2,
    githubId: '67890',
    username: 'bob-test',
    email: 'bob@test.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/67890?v=4',
  },
  charlie: {
    id: 3,
    githubId: '11111',
    username: 'charlie-test',
    email: 'charlie@test.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/11111?v=4',
  },
};

/**
 * Setup GitHub OAuth mocking for a page
 * Intercepts OAuth routes and simulates successful authentication
 */
export async function setupGitHubAuthMock(
  page: Page,
  user: MockUser = TEST_USERS.alice!
): Promise<void> {
  // Intercept the initial OAuth redirect to GitHub
  await page.route('**/github.com/login/oauth/**', async (route: Route) => {
    // Extract the state parameter from the OAuth URL
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state') || 'mock-state';
    const redirectUri = url.searchParams.get('redirect_uri') || 'http://localhost:3000/auth/github/callback';

    // Redirect back to our callback URL with a mock code
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', `mock-code-${user.githubId}`);
    callbackUrl.searchParams.set('state', state);

    await route.fulfill({
      status: 302,
      headers: {
        Location: callbackUrl.toString(),
      },
    });
  });

  // Note: The actual /auth/github/callback handling is done by the backend
  // mock server, not the page routes
}

/**
 * Simulate direct login by setting session state
 * This bypasses the OAuth flow entirely for faster test execution
 */
export async function mockDirectLogin(
  page: Page,
  apiUrl: string,
  user: MockUser = TEST_USERS.alice!
): Promise<void> {
  // Call the test-only login endpoint that sets up session
  const response = await page.request.post(`${apiUrl}/auth/test-login`, {
    data: { userId: user.id },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login as ${user.username}: ${response.status()}`);
  }
}

/**
 * Clear authentication state
 */
export async function mockLogout(page: Page, apiUrl: string): Promise<void> {
  await page.request.post(`${apiUrl}/auth/logout`);
}

/**
 * Verify the user is authenticated
 */
export async function verifyAuthenticated(
  page: Page,
  apiUrl: string
): Promise<MockUser | null> {
  const response = await page.request.get(`${apiUrl}/auth/user`);

  if (!response.ok()) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}
