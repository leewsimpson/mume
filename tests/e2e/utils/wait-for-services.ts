import pg from 'pg';
import { createClient } from 'redis';

const { Pool } = pg;

/**
 * Wait for infrastructure services to be ready
 *
 * Checks PostgreSQL and Redis connectivity with retries.
 */

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

/**
 * Wait for PostgreSQL to be ready
 */
async function waitForPostgres(): Promise<void> {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch {
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  await pool.end();
  throw new Error('PostgreSQL is not ready after maximum retries');
}

/**
 * Wait for Redis to be ready
 */
async function waitForRedis(): Promise<void> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const client = createClient({ url: 'redis://localhost:6379' });
      await client.connect();
      await client.ping();
      await client.quit();
      return;
    } catch {
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw new Error('Redis is not ready after maximum retries');
}

/**
 * Wait for all services to be ready
 */
export async function waitForServices(): Promise<void> {
  console.log('Waiting for PostgreSQL...');
  await waitForPostgres();
  console.log('PostgreSQL is ready');

  console.log('Waiting for Redis...');
  await waitForRedis();
  console.log('Redis is ready');
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  waitForServices()
    .then(() => {
      console.log('All services are ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to wait for services:', error);
      process.exit(1);
    });
}
