# Multi-User Markdown Editor

A real-time collaborative markdown editor built with Yjs, demonstrating multi-user editing capabilities.

## Overview

This is a Proof of Concept (PoC) project that enables multiple users to simultaneously edit markdown documents with live synchronization and preview. Users can see each other's presence and changes in real-time.

## Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously using Yjs CRDT technology
- **Live Markdown Preview**: See formatted markdown output as you type with GitHub Flavored Markdown support
- **User Presence**: View who's currently editing with colored user indicators
- **Split-Pane Interface**: Clean editor layout with source on the left and preview on the right
- **Document Routing**: Support for multiple documents with URL-based IDs
- **Connection Status**: Visual indicators for connection state and automatic reconnection
- **Simple Authentication**: Name-based authentication for quick access

## Tech Stack

### Backend
- Node.js with TypeScript
- Express
- Yjs & y-websocket
- WebSocket (ws)

### Frontend
- React with TypeScript
- Vite
- Yjs & y-websocket
- react-markdown with remark-gfm
- React Router

## Getting Started

### Prerequisites
- Node.js 18+
- Git

### Quick Start

1. **Start the backend API** (runs on port 3000):
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

2. **Start the frontend** (runs on port 5173):
   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

3. Open http://localhost:5173 in multiple browser windows to test collaboration

### Backend
The backend runs on port 3000 and provides:
- Express HTTP server
- WebSocket server for Yjs synchronization at ws://localhost:3000
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

## Development Status

This is a PoC implementation focusing on proving the collaborative editing concept works with Yjs.
