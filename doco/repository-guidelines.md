# Multi-App Repository Guidelines

## Overview

This document defines standards and patterns for structuring multi-app repositories. A **multi-app repository** contains multiple related applications in a single repository that operate independently without formal workspace management tooling.

**When to use this approach:**
- Multiple applications share deployment infrastructure
- Applications are part of the same product ecosystem
- Team wants centralised documentation and CI/CD
- Applications have clear boundaries and limited code sharing
- Team prefers simplicity over advanced monorepo features

**When to use formal monorepo tools instead:**
- Extensive code sharing across applications (3+ shared packages)
- Large team needing sophisticated dependency management
- Complex build orchestration and caching requirements
- Need for dependency graph analysis and affected-only testing

## Repository Structure

### Top-Level Organisation

```
/
├── apps/                    # All application code (REQUIRED)
├── db/                      # Database migrations (OPTIONAL if using database)
├── tests/                   # Cross-app E2E tests (REQUIRED)
├── infra/                   # Infrastructure as Code (OPTIONAL for deployments)
├── doco/                    # Documentation (REQUIRED)
├── scripts/                 # Shared utility scripts (OPTIONAL)
├── .github/workflows/       # CI/CD pipelines (OPTION for CI/CD)
└── packages/                # Shared packages (OPTIONAL, future growth)
```

**Mandatory Rules:**
- Application code MUST live under `apps/` - no exceptions
- Each top-level directory MUST have a single, well-defined purpose
- Cross-application code MUST NOT be imported from other apps - use `packages/` or duplicate
- Database migrations (if present) MUST live in root `db/` directory, not within an app
- Cross-app integration tests MUST live in root `tests/` directory
- Documentation MUST live in dedicated `doco/` directory

### Application Structure

Each application under `apps/` MUST follow this structure:

```
apps/{app-name}/
├── src/                     # Source code
├── tests/                   # App-specific tests (OPTIONAL)
├── dist/                    # Build output (gitignored)
├── package.json             # Dependencies and scripts (REQUIRED)
├── tsconfig.json            # TypeScript configuration (REQUIRED)
├── .env.example             # Environment template (REQUIRED, committed)
├── .env                     # Active environment (REQUIRED, gitignored)
├── .env.{env-name}          # Named environments (OPTIONAL, gitignored)
└── README.md                # App documentation (REQUIRED)
```

**Application Types:**

1. **Backend API**
   - Language: TypeScript/Node.js (or your backend language)
   - Build output: Compiled to `dist/`
   - May include Docker Compose for local service dependencies
   - Responsible for running database migrations (stored in root `db/`)

2. **Frontend Applications**
   - Framework: React/Vue/Svelte + TypeScript + Vite/Next
   - Build output: Bundled to `dist/`
   - Must use unique development ports
   - Proxies API requests during development

3. **Platform-Specific Apps** (Mobile, Desktop, Plugins)
   - May not follow Node.js conventions
   - Must have comprehensive README explaining build/install
   - Should align with project standards where possible

## Package Management Strategy

### Independent Package Management (Default)

**Approach**: Each app manages its own `package.json` and `node_modules/` independently.

**Implementation Rules:**
- NO root `package.json` with workspaces configuration
- NO shared `node_modules/` at repository root
- Each app installs dependencies separately via `npm install` in its directory
- Dependency versions MAY vary between apps (see Dependency Synchronisation)

### Dependency Synchronisation

**Guidelines:**
- Core framework versions SHOULD be consistent across similar app types
  - Example: All React frontends use same React version
- TypeScript SHOULD use consistent versions across all apps for tooling compatibility
- Build tools SHOULD use consistent versions for reproducible builds
- Shared libraries (logging, validation) SHOULD use same versions

### Adding New Dependencies

**Process:**
1. **Evaluate sharing need**: Will 2+ apps use this? If yes, note for future extraction
2. **Check existing apps**: Is this already used? Match the version
3. **Document purpose**: Add comment in package.json for non-obvious dependencies
4. **Update environment**: If new env vars required, update `.env.example`

## Build and Configuration Standards

### TypeScript Configuration

**Backend Applications:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Frontend Applications:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Mandatory Compiler Options:**
- `strict: true` - Enable all strict type checking (REQUIRED)
- `forceConsistentCasingInFileNames: true` - Cross-platform compatibility (REQUIRED)
- `noUncheckedIndexedAccess: true` - Prevent runtime index errors (STRONGLY RECOMMENDED)
- `noUnusedLocals: true` - Keep codebase clean (RECOMMENDED)
- `noUnusedParameters: true` - Identify dead code (RECOMMENDED)

**Frontend-Specific:**
- `noEmit: true` - Bundler (Vite/Webpack) handles transpilation (REQUIRED)
- Path aliases (`@/*`) - Optional but recommended for cleaner imports

### Build Scripts Patterns

**Backend API:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "npm run migrate && npm run build && npm start",
    "dev": "tsx watch src/server.ts",
    "migrate": "node dist/db/migrate.js",
    "migrate:dev": "tsx src/db/migrate.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

**Frontend Applications:**
```json
{
  "scripts": {
    "dev": "npm run kill-port && vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "kill-port": "node ../../scripts/kill-ports.js 5173"
  }
}
```

**Mandatory Patterns:**
- Production start MUST include: `migrate && build && start` (for backends with databases)
- Frontend dev SHOULD kill ports first: `kill-port && vite` (prevents port conflicts)
- Frontend build MUST type-check first: `tsc -b && vite build` (catch type errors before bundling)
- Test scripts SHOULD support watch mode for development

### Frontend Bundler Configuration

**Vite Configuration Standard:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,                    // Unique per app
    strictPort: true,              // Fail if port occupied (REQUIRED)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
```

**Required Settings:**
- `strictPort: true` - Prevents silent port changes that break OAuth/webhooks
- API proxy during development - Avoids CORS issues
- Unique port per app - See Port Allocation section
- Consistent `outDir: 'dist'` - Simplifies CI/CD

## Port Allocation

### Port Assignment Strategy

**Establish a port registry** and document it in your repository README and this document.

**Example Port Allocation:**

| Port Range | Purpose               | Example                         |
|------------|-----------------------|---------------------------------|
| 3000-3099  | Backend APIs          | 3000: Main API, 3001: Admin API |
| 5173-5299  | Frontend Apps (Vite)  | 5173: App 1, 5174: App 2        |
| 5432       | PostgreSQL (Docker)   | Standard PostgreSQL port        |
| 6379       | Redis (Docker)        | Standard Redis port             |
| 9000-9099  | Storage Services      | 9000: MinIO, 10000: Azurite     |

**Rules:**
- Each app MUST have a designated port documented in the registry
- Frontend ports SHOULD be sequential for easy memorisation
- NEVER reuse ports between apps running simultaneously
- Use standard ports for backing services (PostgreSQL: 5432, Redis: 6379)
- Update port registry when adding new applications

**Why strict port enforcement?**
- OAuth callbacks are configured per port (changing ports breaks auth)
- Prevents "wrong app" scenarios during multi-app development
- Enables running all apps simultaneously for integration testing
- Simplifies documentation and onboarding

**Port Cleanup Script:**

Create `scripts/kill-ports.js`:
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const port = process.argv[2];

if (!port) {
  console.error('Usage: node kill-ports.js <port>');
  process.exit(1);
}

try {
  // Platform-specific port killing
  const platform = process.platform;
  if (platform === 'win32') {
    execSync(`FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port}') DO TaskKill /PID %P /F`, { stdio: 'inherit' });
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'inherit' });
  }
  console.log(`Port ${port} freed`);
} catch (err) {
  // Port may already be free
  console.log(`Port ${port} is already free or error occurred`);
}
```

## Testing Notes

### Test Infrastructure Patterns

**Database Reset Pattern:**
```typescript
// apps/api/tests/setup/reset-db.ts
import { resetDatabase, seedTestData } from './seed-data.js';

export async function setupTestDatabase() {
  await resetDatabase();
  await seedTestData();
}

// In test file
beforeEach(async () => {
  await setupTestDatabase();
});
```

**Requirements:**
- Database reset utilities MUST live in `apps/api/tests/setup/`
- Seed data MUST be minimal, representative, and version controlled
- Each test file SHOULD reset to known state before running
- Seed data MUST be updated when test scenarios expand

**Authentication State Caching (Playwright):**
```typescript
// tests/setup/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  await page.waitForURL('/dashboard');

  await page.context().storageState({
    path: 'tests/.auth/admin.json'
  });
});
```

**Playwright Configuration:**
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'authenticated-tests',
      use: { storageState: 'tests/.auth/admin.json' },
      dependencies: ['setup']
    }
  ]
});
```

**Requirements:**
- Auth state MUST be cached in `tests/.auth/` (gitignored)
- Setup tests MUST run before dependent tests
- Reuse auth state to avoid repeated login flows

## Environment Configuration

### Environment File Strategy

**Each application MUST support:**

```
.env.example        # Template with all variables (COMMITTED to git)
.env.local          # Local development config (GITIGNORED)
.env.{cloud}        # Cloud development config (GITIGNORED, e.g., .env.azure, .env.aws)
.env                # Active configuration (GITIGNORED, auto-copied by scripts)
```

**`.env.example` Template:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Storage
STORAGE_ACCOUNT_NAME=your_account_name
STORAGE_ACCOUNT_KEY=your_account_key

# Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Authentication
AUTH_SECRET=generate_with_openssl_rand_hex_32
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**Rules:**
- `.env.example` MUST be committed and document ALL required variables
- `.env.example` MUST use placeholder values, NEVER real secrets
- All `.env*` files except `.env.example` MUST be gitignored
- Document what each variable controls with comments
- Fail fast if required env vars are missing (validate on startup)

### Environment Switching Pattern

**Implement environment switching scripts:**
```json
{
  "scripts": {
    "dev:local": "cp .env.local .env && tsx src/server.ts",
    "dev:cloud": "cp .env.azure .env && tsx src/server.ts",
    "dev:prod-db": "cp .env.production-db .env && tsx src/server.ts"
  }
}
```

**Benefits:**
- Quick switching between local/cloud environments
- Reduces accidental production deployments
- Clear separation of configurations
- Easy to test against different environments

## Database Management

### Migration Organisation

**Location:** Root `db/migrations/` directory (NOT inside `apps/`)

**Why root level?**
- Database is shared infrastructure across apps
- Migrations represent schema evolution, not app-specific code
- Easier to track schema changes across app versions
- Clear separation from application code

**Naming Convention:**
```
db/migrations/
├── 001_create_users_table.sql
├── 002_create_products_table.sql
├── 003_add_email_verification.sql
├── 004_create_orders_table.sql
└── 005_add_product_categories.sql
```

**Rules:**
- Use sequential numbering: `001`, `002`, `003` (zero-padded)
- Use descriptive names: `{number}_{action}_{subject}.sql`
- Migrations MUST be SQL files (not TypeScript/JavaScript)
- NEVER delete or modify existing migrations - always create new ones
- Migrations MUST be idempotent where possible (`CREATE TABLE IF NOT EXISTS`)
- Test migrations both up and down (if supporting rollbacks)

### Migration Execution

**Migration Runner** (`apps/api/src/db/migrate.ts`):
```typescript
import fs from 'fs';
import path from 'path';
import { pool } from './connection';

export async function migrate() {
  const migrationsDir = path.join(__dirname, '../../../db/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const file of files) {
    const version = parseInt(file.split('_')[0]);

    // Check if already applied
    const { rows } = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version]
    );

    if (rows.length === 0) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying migration ${file}...`);

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await pool.query('COMMIT');
        console.log(`Migration ${file} applied successfully`);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    }
  }
}
```

**Package Scripts:**
```json
{
  "scripts": {
    "migrate": "node dist/db/migrate.js",
    "migrate:dev": "tsx src/db/migrate.ts",
    "start:prod": "npm run migrate && npm run build && npm start"
  }
}
```

**Mandatory Patterns:**
- Production start MUST run migrations first: `migrate && build && start`
- Migration failures MUST fail the deployment (use transactions)
- Track applied migrations in `schema_migrations` table
- Migrations MUST be tested in development before production deployment

## Documentation Structure

### Required Documentation Hierarchy

```
doco/
├── README.md                    # Documentation index
├── TODO.md                      # Technical debt and future work
├── repostory-guidelines.md      # This document
├── design/                      # Technical design documents
│   ├── README.md                # Architecture overview
│   ├── api-reference.md         # API documentation (OPTIONAL IF WE HAVE APIS)
│   ├── database-schema.md       # Database design  (OPTIONAL IF WE HAVE A DB)
│   ├── hld.md                   # High level design - focusing on key technical decisions and component diagrams
│   └── {component}-design.md    # OPTIONAL - One design document per component if needed
└── research/                    # OPTIONAL - Technology evaluations and POCs
    └── {technology}.md
```

### Application-Level Documentation

**Each app MUST have `apps/{app}/README.md` covering:**

```markdown
# {App Name}

## Purpose
Brief description of what this app does and its role in the system.

## Tech Stack

## Local Development

### Prerequisites

### Setup

### Environment Variables
See `.env.example` for required variables.

## Building

## Testing

## Architecture Notes
- Authentication: [brief description]
- State Management: [brief description]
- Key Patterns: [any important patterns used]

## Related Documentation
```

### Documentation Principles

**MUST follow:**

1. **High-Level Focus** - Avoid detailed implementation (code is the source of truth)
2. **Keep Current** - Update documentation when implementation changes
3. **No Duplication** - Reference other documents instead of copying content
4. **Consistent Language** - Use project's chosen English variant (British/American)
5. **Review Before Complete** - Verify diagrams current, cross-references valid, terminology consistent


### Logging Standards

**Use structured logging with context:**

```typescript
// ✅ GOOD - Structured logging with context
logger.info('User created successfully', {
  userId: user.id,
  email: user.email,
  operation: 'create_user',
  duration: Date.now() - startTime
});

// ❌ BAD - Unstructured console.log
console.log('User created:', user.id);
```

**Logging Principles:**
1. **Structured Format** - Always use logging library (winston, pino), not `console.log`
2. **Include Context** - userId, requestId, operation name, resource IDs
3. **Appropriate Levels**:
   - `error` - Failures, exceptions, data loss
   - `warn` - Degraded state, recoverable errors
   - `info` - Normal operations, business events
   - `debug` - Development diagnostics (not in production)
4. **Never Log Secrets** - No passwords, API keys, credit cards, tokens, PII
5. **Request Correlation** - Include correlation/trace ID for distributed tracing
6. **Meaningful Messages** - Searchable, clear messages. Good: "Failed to upload file to storage". Bad: "Error occurred"

**Logging Infrastructure:**
- Backend: Winston/Pino with JSON formatter
- Frontend: Console in dev, remote logging service in production
- Centralised: Send to observability platform (DataDog, New Relic, Application Insights, CloudWatch)

