# End-to-End Tests

This directory contains comprehensive E2E tests for the Mume collaborative markdown editor.

## Overview

E2E tests use [Playwright](https://playwright.dev/) to test complete user flows through the application. Tests cover authentication, repository browsing, document editing, real-time collaboration, and the comment system.

## Directory Structure

```
tests/
├── e2e/
│   ├── fixtures/         # Test fixtures (auth, database)
│   ├── mocks/            # Mock implementations (GitHub API, OAuth)
│   ├── setup/            # Global setup and teardown
│   ├── specs/            # Test specifications
│   └── utils/            # Test helper utilities
├── seed-data/            # Database seed data
├── .auth/                # Auth state cache (gitignored)
├── playwright.config.ts  # Playwright configuration
└── package.json
```

## Prerequisites

1. Docker running with PostgreSQL and Redis:
   ```bash
   docker-compose up -d
   ```

2. Install dependencies:
   ```bash
   cd tests
   npm install
   npx playwright install
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Run specific test file
npx playwright test e2e/specs/auth-flow.unauth.test.ts

# Debug mode
npm run test:debug

# View test report
npm run test:report
```

## Test Categories

### Authentication (US-MVP-001)
- `auth-flow.unauth.test.ts` - OAuth flow and session management

### Repository Selection (US-MVP-001A)
- `repository-selection.test.ts` - Repository listing, search, and selection

### File Browsing (US-MVP-001B, US-MVP-003)
- `file-browsing.test.ts` - File tree navigation and document list views

### Document Creation (US-MVP-002)
- `document-creation.test.ts` - Creating new markdown files

### Editor & Auto-Save (US-MVP-004, US-MVP-011)
- `editor-autosave.test.ts` - Editor functionality, auto-save, and manual save

### Comments (US-MVP-005, US-MVP-006, US-MVP-007)
- `comments.test.ts` - Comment threads, replies, resolution, and deletion

### User Presence (US-MVP-010, US-MVP-012)
- `user-presence.test.ts` - Real-time presence and comment highlighting

## Mock Strategy

### GitHub OAuth (Mocked)
- OAuth flow is bypassed using a test-only `/auth/test-login` endpoint
- Only available when `E2E_TEST_MODE=true`

### GitHub API (Mocked)
- Playwright route interception mocks `/api/repositories/*` endpoints
- Controlled test data for repositories, file trees, and content

### Database (Real)
- Uses real PostgreSQL via Docker
- Test database: `markdown_editor_test`
- Reset and seeded before each test run

### Redis (Real)
- Uses real Redis via Docker
- Session storage works normally

## Environment Variables

Tests use these environment variables (set in `playwright.config.ts`):

```
E2E_TEST_MODE=true                    # Enables test-only endpoints
DATABASE_URL=postgresql://...         # Test database connection
REDIS_URL=redis://localhost:6379      # Session store
GITHUB_CLIENT_ID=test-client-id       # Mock OAuth
GITHUB_CLIENT_SECRET=test-client-secret
```

## Writing New Tests

1. Create test file in `e2e/specs/` with naming convention:
   - `*.test.ts` - Authenticated tests
   - `*.unauth.test.ts` - Unauthenticated tests
   - `*.auth.test.ts` - Auth-specific tests

2. Use fixtures from `e2e/fixtures/`:
   ```typescript
   import { test, expect } from '../fixtures/index.js';

   test('my test', async ({ authenticatedPage, currentUser }) => {
     // Test code
   });
   ```

3. Use test helpers from `e2e/utils/`:
   ```typescript
   import { waitForPageLoad, selectTextInEditor } from '../utils/test-helpers.js';
   ```

4. For database state, use fixtures:
   ```typescript
   import { seedTestComments, resetDatabase } from '../fixtures/database.fixture.js';

   test.beforeEach(async () => {
     await resetDatabase();
     await seedTestUsers();
   });
   ```

## Debugging Tips

1. **Run in debug mode**: `npm run test:debug`
2. **Add pauses**: `await page.pause()`
3. **Screenshots**: `await page.screenshot({ path: 'debug.png' })`
4. **Check trace**: Traces are saved on failure in `playwright-report/`
5. **Slow down**: Add `slowMo: 1000` to Playwright config

## CI Integration

Tests are designed to run in CI with:
- Single worker (`workers: 1`)
- Retries on failure (`retries: 2`)
- HTML report generation
- Screenshot and video capture on failure
