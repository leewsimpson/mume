# Multi-User Markdown Editor

A real-time collaborative markdown ABC editor 

## Overview 1235678

This is a Proof of Concept (PoC) project that enables multiple users to simultaneously edit markdown documents with live synchronisation and preview. Users can see each other's presence and changes in real-time.

## Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously using Yjs CRDT technology
- **Live Markdown Preview**: See formatted markdown output as you type with GitHub Flavoured Markdown support
- **User Presence**: View who's currently editing with coloured user indicators and GitHub avatars
- **Split-Pane Interface**: Clean editor layout with source on the left and preview on the right
- **Document Routing**: Support for multiple documents with URL-based IDs
- **Connection Status**: Visual indicators for connection state and automatic reconnection
- **GitHub Authentication**: Sign in with GitHub OAuth for secure access to repositories
- **Comment System**: Add, reply to, and resolve comment threads on document sections

## Tech Stack

### Backend
- Node.js with TypeScript
- Express
- Yjs & y-websocket
- WebSocket (ws)
- Redis (session and user data storage)

### Frontend
- React with TypeScript
- Vite
- Yjs & y-websocket
- react-markdown with remark-gfm
- React Router

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start

1. **Start infrastructure services** (Redis):
   ```bash
   docker-compose up -d
   ```

2. **Set up environment variables**:
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env if needed - defaults should work for local development
   ```

3. **Start the backend API** (runs on port 3000):
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

4. **Start the frontend** (runs on port 5173):
   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

5. Open http://localhost:5173 in multiple browser windows to test collaboration

### Infrastructure Services

The project uses Docker Compose to run supporting services:

- **Redis** (port 6379): Session store and user data storage

To stop services:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

### Backend
The backend runs on port 3000 and provides:
- Express HTTP server
- WebSocket server for Yjs synchronisation at ws://localhost:3000
- In-memory document store
- CORS configured for http://localhost:5173

### Frontend
The frontend runs on port 5173 and provides:
- Split-pane markdown editor
- Real-time preview
- User presence display
- Connection status monitoring

## Project Structure

- [`/apps/api`](apps/api/README.md) - Express server with Yjs WebSocket integration
- [`/apps/frontend`](apps/frontend/README.md) - React application with Vite
- [`/tests`](tests/README.md) - End-to-end tests with Playwright
- `/scripts` - Build and development scripts
- `/doco` - Project documentation

For detailed setup and configuration of each application, see their respective README files.

## Development Utilities

### Port Management

If you encounter port conflicts during development, use the kill-ports utility:

```bash
node scripts/kill-ports.js <port>
```

The frontend dev script automatically runs this before starting Vite to ensure port 5173 is available.

## Testing

### End-to-End Tests

The project includes comprehensive E2E tests using Playwright. See [`tests/README.md`](tests/README.md) for full documentation.

```bash
# Ensure Docker services are running
docker-compose up -d

# Install test dependencies
cd tests
npm install
npx playwright install

# Run all tests
npm test

# Run with UI for debugging
npm run test:ui
```

### Unit Tests

Each application has its own unit test suite:

```bash
# Backend tests (Jest)
cd apps/api && npm test

# Frontend tests (Vitest)
cd apps/frontend && npm test
```

## Development Status

This is a PoC implementation focusing on proving the collaborative editing concept works with Yjs.
# Multi-User Markdown Editor

A real-time collaborative markdown ABC editor 

## Overview

This is a Proof of Concept (PoC) project that enables multiple users to simultaneously edit markdown documents with live synchronisation and preview. Users can see each other's presence and changes in real-time.

## Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously using Yjs CRDT technology
- **Live Markdown Preview**: See formatted markdown output as you type with GitHub Flavoured Markdown support
- **User Presence**: View who's currently editing with coloured user indicators and GitHub avatars
- **Split-Pane Interface**: Clean editor layout with source on the left and preview on the right
- **Document Routing**: Support for multiple documents with URL-based IDs
- **Connection Status**: Visual indicators for connection state and automatic reconnection
- **GitHub Authentication**: Sign in with GitHub OAuth for secure access to repositories
- **Comment System**: Add, reply to, and resolve comment threads on document sections

## Tech Stack

### Backend
- Node.js with TypeScript
- Express
- Yjs & y-websocket
- WebSocket (ws)
- Redis (session and user data storage)

### Frontend
- React with TypeScript
- Vite
- Yjs & y-websocket
- react-markdown with remark-gfm
- React Router

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start

1. **Start infrastructure services** (Redis):
   ```bash
   docker-compose up -d
   ```

2. **Set up environment variables**:
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env if needed - defaults should work for local development
   ```

3. **Start the backend API** (runs on port 3000):
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

4. **Start the frontend** (runs on port 5173):
   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

5. Open http://localhost:5173 in multiple browser windows to test collaboration

### Infrastructure Services

The project uses Docker Compose to run supporting services:

- **Redis** (port 6379): Session store and user data storage

To stop services:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

### Backend
The backend runs on port 3000 and provides:
- Express HTTP server
- WebSocket server for Yjs synchronisation at ws://localhost:3000
- In-memory document store
- CORS configured for http://localhost:5173

### Frontend
The frontend runs on port 5173 and provides:
- Split-pane markdown editor
- Real-time preview
- User presence display
- Connection status monitoring

## Project Structure

- [`/apps/api`](apps/api/README.md) - Express server with Yjs WebSocket integration
- [`/apps/frontend`](apps/frontend/README.md) - React application with Vite
- [`/tests`](tests/README.md) - End-to-end tests with Playwright
- `/scripts` - Build and development scripts
- `/doco` - Project documentation

For detailed setup and configuration of each application, see their respective README files.

## Development Utilities

### Port Management

If you encounter port conflicts during development, use the kill-ports utility:

```bash
node scripts/kill-ports.js <port>
```

The frontend dev script automatically runs this before starting Vite to ensure port 5173 is available.

## Testing

### End-to-End Tests

The project includes comprehensive E2E tests using Playwright. See [`tests/README.md`](tests/README.md) for full documentation.

```bash
# Ensure Docker services are running
docker-compose up -d

# Install test dependencies
cd tests
npm install
npx playwright install

# Run all tests
npm test

# Run with UI for debugging
npm run test:ui
```

### Unit Tests

Each application has its own unit test suite:

```bash
# Backend tests (Jest)
cd apps/api && npm test

# Frontend tests (Vitest)
cd apps/frontend && npm test
```

## Development Status

This is a PoC implementation focusing on proving the collaborative editing concept works with Yjs.
