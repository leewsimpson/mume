import { createClient } from 'redis';
import { TEST_USERS } from '../mocks/github-auth.mock.js';

/**
 * Redis fixture for E2E testing
 *
 * Uses real Redis database with test data seeding and reset.
 * Following testing principle: "Use real databases and services in Docker where possible"
 */

// Test Redis configuration
const TEST_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Get Redis client
 */
export async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!redisClient) {
    redisClient = createClient({ url: TEST_REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Test Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Reset Redis test data
 * Clears all user and token keys
 */
export async function resetRedis(): Promise<void> {
  const client = await getRedisClient();
  
  // Delete all user and token keys
  const userKeys = await client.keys('user:*');
  const tokenKeys = await client.keys('token:*');
  
  const allKeys = [...userKeys, ...tokenKeys];
  
  if (allKeys.length > 0) {
    await client.del(allKeys);
  }
  
  console.log(`Reset Redis: deleted ${allKeys.length} keys`);
}

/**
 * Seed test users into Redis
 */
export async function seedTestUsers(): Promise<void> {
  const client = await getRedisClient();

  for (const [_key, user] of Object.entries(TEST_USERS)) {
    // Store user data
    await client.hSet(`user:github:${user.githubId}`, {
      id: user.id.toString(),
      githubId: user.githubId,
      username: user.username,
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Store ID lookup reference
    await client.set(`user:id:${user.id}`, user.githubId);

    // Store mock encrypted token
    // Note: The actual encryption doesn't matter for testing as we mock the GitHub API
    await client.hSet(`token:${user.id}`, {
      accessTokenEncrypted: 'mock-encrypted-token',
      accessTokenIv: 'mock-iv-value',
      accessTokenAuthTag: 'mock-auth-tag',
      provider: 'github',
      scope: 'repo,user:email',
      tokenType: 'bearer',
      expiresAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Set user ID counter to max ID to avoid conflicts
  const maxId = Math.max(...Object.values(TEST_USERS).map((u) => u.id));
  await client.set('user:id:counter', maxId.toString());

  console.log(`Seeded ${Object.keys(TEST_USERS).length} test users to Redis`);
}

/**
 * Get user by ID from Redis (for test verification)
 */
export async function getUserById(userId: number): Promise<any | null> {
  const client = await getRedisClient();
  
  // Lookup githubId from user ID
  const githubId = await client.get(`user:id:${userId}`);
  
  if (!githubId) {
    return null;
  }

  const userData = await client.hGetAll(`user:github:${githubId}`);
  
  if (!userData || Object.keys(userData).length === 0) {
    return null;
  }

  return {
    id: parseInt(userData.id, 10),
    githubId: userData.githubId,
    username: userData.username,
    email: userData.email || null,
    avatarUrl: userData.avatarUrl || null,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };
}

/**
 * Get user by GitHub ID from Redis (for test verification)
 */
export async function getUserByGithubId(githubId: string): Promise<any | null> {
  const client = await getRedisClient();
  
  const userData = await client.hGetAll(`user:github:${githubId}`);
  
  if (!userData || Object.keys(userData).length === 0) {
    return null;
  }

  return {
    id: parseInt(userData.id, 10),
    githubId: userData.githubId,
    username: userData.username,
    email: userData.email || null,
    avatarUrl: userData.avatarUrl || null,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };
}

/**
 * Full Redis setup for tests
 */
export async function setupTestRedis(): Promise<void> {
  await resetRedis();
  await seedTestUsers();
}
