# Multi-User Markdown Editor - Backend API

## Purpose

Backend API server providing real-time collaborative markdown editing using Yjs CRDT technology. This server manages WebSocket connections and synchronizes document state across multiple connected clients.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **Real-time Sync**: Yjs with y-websocket
- **WebSocket**: ws library
- **Build Tool**: TypeScript Compiler (tsc)
- **Dev Tool**: tsx (TypeScript execute & watch)

## Local Development

### Prerequisites

- Node.js 18+ (with npm)
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

3. Set up GitHub OAuth:
   - See [SETUP_OAUTH.md](./SETUP_OAUTH.md) for detailed instructions
   - Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`

4. Start development server:
   ```bash
   npm run dev
   ```

The server will start on port 3000 with hot-reloading enabled.

### Environment Variables

See `.env.example` for required variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend origin for CORS (default: http://localhost:5173)
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID (see [SETUP_OAUTH.md](./SETUP_OAUTH.md))
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret (see [SETUP_OAUTH.md](./SETUP_OAUTH.md))
- `SESSION_SECRET` - Session encryption secret (generate with `openssl rand -hex 32`)
- `TOKEN_ENCRYPTION_KEY` - Token encryption key (generate with `openssl rand -hex 32`)

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
| `comment.routes.test.ts` | Comment API endpoint tests |
| `repository.routes.test.ts` | Repository API endpoint tests |
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

## Related Documentation

- [Project README](../../README.md)
- [Repository Guidelines](../../doco/repository-guidelines.md)
- [Frontend Application](../frontend/README.md)
