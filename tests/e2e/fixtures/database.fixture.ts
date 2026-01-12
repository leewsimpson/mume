import pg from 'pg';
import { TEST_USERS } from '../mocks/github-auth.mock.js';

const { Pool } = pg;

/**
 * Database fixture for E2E testing
 *
 * Uses real PostgreSQL database with test data seeding and reset.
 * Following testing principle: "Use real databases and services in Docker where possible"
 */

// Test database configuration
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/markdown_editor_test';

let pool: pg.Pool | null = null;

/**
 * Get database connection pool
 */
export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Create test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
  });

  try {
    // Check if database exists
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'markdown_editor_test'"
    );

    if (result.rows.length === 0) {
      await adminPool.query('CREATE DATABASE markdown_editor_test');
      console.log('Created test database: markdown_editor_test');
    }
  } finally {
    await adminPool.end();
  }
}

/**
 * Run migrations on test database
 */
export async function runMigrations(): Promise<void> {
  const testPool = getPool();

  // Create migrations table
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Define migrations inline for test setup
  const migrations = [
    {
      name: '001_create_users_table',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          github_id VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
      `,
    },
    {
      name: '002_create_user_tokens_table',
      sql: `
        CREATE TABLE IF NOT EXISTS user_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL,
          access_token_encrypted TEXT NOT NULL,
          access_token_iv VARCHAR(32) NOT NULL,
          access_token_auth_tag VARCHAR(32) NOT NULL,
          token_type VARCHAR(50) DEFAULT 'bearer',
          scope TEXT,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_tokens_provider ON user_tokens(provider);
      `,
    },
    {
      name: '003_create_comments_table',
      sql: `
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          document_path TEXT NOT NULL,
          repo_owner VARCHAR(255) NOT NULL,
          repo_name VARCHAR(255) NOT NULL,
          char_start INTEGER NOT NULL,
          char_end INTEGER NOT NULL,
          text TEXT NOT NULL,
          resolved BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(repo_owner, repo_name, document_path);
        CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);
      `,
    },
    {
      name: '004_create_comment_replies_table',
      sql: `
        CREATE TABLE IF NOT EXISTS comment_replies (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
      `,
    },
  ];

  for (const migration of migrations) {
    // Check if already applied
    const result = await testPool.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration.name]
    );

    if (result.rows.length === 0) {
      await testPool.query('BEGIN');
      try {
        await testPool.query(migration.sql);
        await testPool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
        await testPool.query('COMMIT');
        console.log(`Applied migration: ${migration.name}`);
      } catch (error) {
        await testPool.query('ROLLBACK');
        throw error;
      }
    }
  }
}

/**
 * Reset database to clean state
 * Truncates all tables while preserving schema
 */
export async function resetDatabase(): Promise<void> {
  const testPool = getPool();

  await testPool.query(`
    TRUNCATE TABLE comment_replies CASCADE;
    TRUNCATE TABLE comments CASCADE;
    TRUNCATE TABLE user_tokens CASCADE;
    TRUNCATE TABLE users CASCADE;
  `);
}

/**
 * Seed test users into database
 */
export async function seedTestUsers(): Promise<void> {
  const testPool = getPool();

  for (const [_key, user] of Object.entries(TEST_USERS)) {
    // Insert user
    await testPool.query(
      `INSERT INTO users (id, github_id, username, email, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (github_id) DO UPDATE SET
         username = EXCLUDED.username,
         email = EXCLUDED.email,
         avatar_url = EXCLUDED.avatar_url`,
      [user.id, user.githubId, user.username, user.email, user.avatarUrl]
    );

    // Insert mock token (encrypted with test key)
    // Note: The actual encryption doesn't matter for testing as we mock the GitHub API
    await testPool.query(
      `INSERT INTO user_tokens (user_id, provider, access_token_encrypted, access_token_iv, access_token_auth_tag, scope)
       VALUES ($1, 'github', 'mock-encrypted-token', 'mock-iv-value', 'mock-auth-tag', 'repo,user:email')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );
  }

  // Reset sequence to avoid conflicts
  await testPool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
}

/**
 * Seed test comments for a document
 */
export async function seedTestComments(
  userId: number,
  repoOwner: string,
  repoName: string,
  documentPath: string
): Promise<number[]> {
  const testPool = getPool();
  const commentIds: number[] = [];

  const comments = [
    { charStart: 10, charEnd: 50, text: 'This section needs clarification' },
    { charStart: 100, charEnd: 150, text: 'Great explanation here!' },
    { charStart: 200, charEnd: 250, text: 'Consider adding an example', resolved: true },
  ];

  for (const comment of comments) {
    const result = await testPool.query(
      `INSERT INTO comments (user_id, document_path, repo_owner, repo_name, char_start, char_end, text, resolved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        documentPath,
        repoOwner,
        repoName,
        comment.charStart,
        comment.charEnd,
        comment.text,
        comment.resolved ?? false,
      ]
    );
    commentIds.push(result.rows[0].id);
  }

  return commentIds;
}

/**
 * Seed comment replies
 */
export async function seedCommentReplies(
  commentId: number,
  userId: number
): Promise<number[]> {
  const testPool = getPool();
  const replyIds: number[] = [];

  const replies = [
    { text: 'I agree, let me update this.' },
    { text: 'Done! Please review.' },
  ];

  for (const reply of replies) {
    const result = await testPool.query(
      `INSERT INTO comment_replies (comment_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [commentId, userId, reply.text]
    );
    replyIds.push(result.rows[0].id);
  }

  return replyIds;
}

/**
 * Get all comments for a document
 */
export async function getComments(
  repoOwner: string,
  repoName: string,
  documentPath: string
): Promise<any[]> {
  const testPool = getPool();
  const result = await testPool.query(
    `SELECT c.*, u.username, u.avatar_url
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.repo_owner = $1 AND c.repo_name = $2 AND c.document_path = $3
     ORDER BY c.char_start ASC`,
    [repoOwner, repoName, documentPath]
  );
  return result.rows;
}

/**
 * Full database setup for tests
 */
export async function setupTestDatabase(): Promise<void> {
  await createTestDatabase();
  await runMigrations();
  await resetDatabase();
  await seedTestUsers();
}
