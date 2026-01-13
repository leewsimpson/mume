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
import { RedisUserService } from './services/redis-user.service.js';
import authRoutes from './routes/auth.routes.js';
import repositoryRoutes from './routes/repository.routes.js';
import commentRoutes from './routes/comment.routes.js';
import { startGitHubSyncJob, stopGitHubSyncJob } from './jobs/githubSync.job.js';

// Global Redis user service instance
export let redisUserService: RedisUserService;

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
  console.log(`Connecting to Redis at: ${REDIS_URL}`);
  const redisClient = createClient({ 
    url: REDIS_URL,
    socket: {
      connectTimeout: 10000, // 10 second timeout
      reconnectStrategy: (retries) => {
        console.log(`Redis reconnect attempt ${retries}`);
        if (retries > 10) {
          return new Error('Redis max reconnect attempts reached');
        }
        return Math.min(retries * 100, 3000); // exponential backoff up to 3s
      }
    }
  });
  redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
  redisClient.on('connect', () => console.log('Redis client connecting...'));
  redisClient.on('ready', () => console.log('✅ Redis connected and ready'));
  
  try {
    await redisClient.connect();
    console.log('✅ Redis connection established');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to connect to Redis:', errorMessage);
    throw new Error(`Redis connection failed: ${errorMessage}`);
  }

  // Initialize Redis user service
  redisUserService = new RedisUserService(redisClient);
  console.log('✅ Redis user service initialized');

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

  // Health check endpoint with dependency checks
  app.get('/health', async (_req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: 'unknown'
      }
    };

    try {
      // Check Redis connectivity
      const pingResult = await redisClient.ping();
      health.dependencies.redis = pingResult === 'PONG' ? 'connected' : 'error';
    } catch (error) {
      health.status = 'degraded';
      health.dependencies.redis = 'disconnected';
      console.error('Health check: Redis ping failed', error);
    }

    // Return 503 if any critical dependency is down
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
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
  server.listen(parseInt(PORT), '0.0.0.0', () => {
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
