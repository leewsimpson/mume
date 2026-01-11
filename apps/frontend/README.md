# Multi-User Markdown Editor - Frontend

React-based frontend application for real-time collaborative markdown editing.

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Yjs** - CRDT library for real-time collaboration
- **y-websocket** - WebSocket provider for Yjs
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support

## Setup

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

The frontend will be available at http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (typecheck + build)
- `npm run preview` - Preview production build locally

## Configuration

See `.env.example` for available environment variables:
- `VITE_API_URL` - WebSocket URL for backend connection (default: ws://localhost:3000)

## Development

The application connects to the backend API at port 3000. Ensure the backend is running before starting the frontend.

API requests to `/api/*` are proxied to `http://localhost:3000` via Vite's proxy configuration.
