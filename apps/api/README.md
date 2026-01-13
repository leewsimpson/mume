# Multi-User Markdown Editor - Backend API

## Purpose

Backend API server providing real-time collaborative markdown editing using Yjs CRDT technology. This server manages WebSocket connections and synchronizes document state across multiple connected clients.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **Real-time Sync**: Yjs with y-websocket
- **WebSocket**: ws library
- **Session Storage**: Redis
- **Build Tool**: TypeScript Compiler (tsc)
- **Dev Tool**: tsx (TypeScript execute & watch)

## Local Development

### Prerequisites

- Node.js 18+ (with npm)
- Docker (for Redis)
- Git

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Start Redis:
   ```bash
   docker-compose up -d
   ```

4. Set up GitHub OAuth:
   - See [SETUP_OAUTH.md](./SETUP_OAUTH.md) for detailed instructions
   - Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`

5. Start development server:
   ```bash
   npm run dev
   ```

The server will start on port 3000 with hot-reloading enabled.

### Environment Variables

See `.env.example` for required variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend origin for CORS (default: http://localhost:5173)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID (see [SETUP_OAUTH.md](./SETUP_OAUTH.md))
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret (see [SETUP_OAUTH.md](./SETUP_OAUTH.md))
- `SESSION_SECRET` - Session encryption secret (generate with `openssl rand -hex 32`)
- `TOKEN_ENCRYPTION_KEY` - Token encryption key (generate with `openssl rand -hex 32`)

## Redis Data Structures

User and session data is stored in Redis using the following key patterns:

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `user:github:{githubId}` | Hash | User profile (id, username, email, avatarUrl, createdAt) |
| `user:id:{userId}` | String | Maps internal user ID to GitHub ID for lookups |
| `token:{userId}` | Hash | Encrypted GitHub token (encrypted, iv, authTag, tokenType, scope) |
| `user:id:counter` | String | Auto-increment counter for generating user IDs |

### Comment Storage

Comments are stored as YAML files in GitHub repositories under the `.mume/` folder, preserving the original document path structure:

```
Original file: docs/guide.md
Comment file:  .mume/docs/guide.md
```

## Building

Build for production:

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Running in Production

```bash
npm run build
npm start
```

## Testing

The API uses **Jest** as the test framework with ES modules support.

### Test Location

Tests are located in `tests/`:

| File | Description |
|------|-------------|
| `token.service.test.ts` | Token encryption/decryption service tests |
| `github.service.test.ts` | GitHub API integration tests |

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture Notes

- **WebSocket Server**: Integrated with Express HTTP server for Yjs synchronization
- **Document Store**: In-memory Map storing Y.Doc instances by document ID
- **CORS**: Configured to allow frontend origin during development
- **Authentication**: GitHub OAuth for user authentication (see [SETUP_OAUTH.md](./SETUP_OAUTH.md))
- **Session Storage**: Redis for session data and user profiles
- **Comment Storage**: YAML files in GitHub under `.mume/` folder

## Related Documentation

- [Project README](../../README.md)
- [Repository Guidelines](../../doco/repository-guidelines.md)
- [Frontend Application](../frontend/README.md)
