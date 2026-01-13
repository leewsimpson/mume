import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/specs',

  // Global setup and teardown
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is accidentally left in
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  // Use 1 worker in CI, 50% of CPU cores locally (to leave resources for the app servers)
  workers: process.env.CI ? 1 : '50%',

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Global timeout for each test
  timeout: 60000,

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  // Configure projects for different test scenarios
  projects: [
    // Setup project - authenticates and saves state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: './e2e/setup',
    },

    // Tests requiring authentication
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.auth\.test\.ts/,
    },

    // Tests not requiring authentication (login flow, public pages)
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.unauth\.test\.ts/,
    },

    // All tests (default)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.(setup|unauth\.test)\.ts/,
    },
  ],

  // Web server configuration - starts both frontend and backend
  webServer: [
    {
      command: 'cd ../apps/api && npm run dev',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
        FRONTEND_URL: 'http://localhost:5173',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/markdown_editor_test',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'test-session-secret-for-e2e-testing',
        TOKEN_ENCRYPTION_KEY: 'a'.repeat(64), // 32-byte key in hex
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
        GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
        // Enable test mode for mocking
        E2E_TEST_MODE: 'true',
      },
    },
    {
      command: 'cd ../apps/frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        VITE_API_URL: 'http://localhost:3000',
        VITE_WS_URL: 'ws://localhost:3000',
      },
    },
  ],
});
