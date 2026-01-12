import { test as setup } from '@playwright/test';
import { TEST_USERS } from '../mocks/github-auth.mock.js';

/**
 * Authentication setup for Playwright
 *
 * Creates an authenticated session and saves it for reuse across tests.
 * This avoids repeating the login flow for every test.
 */

setup('authenticate as primary user', async ({ page, context }) => {
  const user = TEST_USERS.alice!;

  // Call the test login endpoint
  const response = await page.request.post('http://localhost:3000/auth/test-login', {
    data: { userId: user.id },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to authenticate as ${user.username}: ${response.status()}`);
  }

  // Verify authentication
  const userResponse = await page.request.get('http://localhost:3000/auth/user');
  if (!userResponse.ok()) {
    throw new Error('Authentication verification failed');
  }

  const userData = await userResponse.json();
  console.log(`✅ Authenticated as ${userData.user.username}`);

  // Save authentication state
  await context.storageState({ path: '.auth/user.json' });
});
