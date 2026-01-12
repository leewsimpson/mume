import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

// Environment configuration
const PORT = process.env.PORT ?? '3000';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// Create Express app
const app = express();

// Configure CORS to allow frontend origin
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  // Extract document name from URL (e.g., ws://localhost:3000/doc-name)
  const docName = req.url?.slice(1) || 'default';

  console.log(`WebSocket connection established for document: ${docName}`);

  // Setup WebSocket connection with y-websocket utilities
  // Note: setupWSConnection handles document creation and awareness cleanup automatically
  setupWSConnection(ws, req, { docName, gc: true });
});

// Start server
server.listen(parseInt(PORT), () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📝 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
