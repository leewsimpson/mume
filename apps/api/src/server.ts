import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import passport from 'passport';
import { configurePassport, validateOAuthConfig } from './config/passport.js';
import { validateEncryptionKey } from './services/token.service.js';
import authRoutes from './routes/auth.routes.js';
import repositoryRoutes from './routes/repository.routes.js';
import commentRoutes from './routes/comment.routes.js';
import { startGitHubSyncJob, stopGitHubSyncJob } from './jobs/githubSync.job.js';

// Environment configuration
const PORT = process.env.PORT ?? '3000';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'development-secret-change-in-production';

// Validate configuration
validateOAuthConfig();
if (!validateEncryptionKey()) {
  throw new Error('TOKEN_ENCRYPTION_KEY is not properly configured');
}

// Bootstrap server
async function bootstrap() {
  // Create Express app
  const app = express();

  // Parse JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure CORS to allow frontend origin
  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
  }));

  // Initialize Redis client for session store
  const redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();
  console.log('✅ Redis connected');

  // Configure session with Redis store
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      },
    })
  );

  // Initialize Passport
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Register routes
  app.use('/auth', authRoutes);
  app.use('/api/repositories', repositoryRoutes);
  app.use('/api/comments', commentRoutes);

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

  // Start GitHub sync background job
  const syncJobInterval = startGitHubSyncJob();
  console.log('✅ GitHub sync job started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    stopGitHubSyncJob(syncJobInterval);
    await redisClient.quit();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Start the server
bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
