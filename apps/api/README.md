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

3. Start development server:
   ```bash
   npm run dev
   ```

The server will start on port 3000 with hot-reloading enabled.

### Environment Variables

See `.env.example` for required variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend origin for CORS (default: http://localhost:5173)

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

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Architecture Notes

- **WebSocket Server**: Integrated with Express HTTP server for Yjs synchronization
- **Document Store**: In-memory Map storing Y.Doc instances by document ID
- **CORS**: Configured to allow frontend origin during development
- **No Authentication**: PoC implementation - authentication happens client-side via name prompt

## Related Documentation

- [Project README](../../README.md)
- [Repository Guidelines](../../doco/repository-guidelines.md)
- [Frontend Application](../frontend/README.md)
