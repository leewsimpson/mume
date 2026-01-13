import { setupTestRedis, closeRedisClient } from '../fixtures/redis.fixture.js';
import { waitForServices } from '../utils/wait-for-services.js';

/**
 * Global setup for Playwright tests
 *
 * Runs once before all tests to prepare the test environment:
 * 1. Wait for Docker services (Redis) to be ready
 * 2. Reset Redis and seed test users
 */
async function globalSetup(): Promise<void> {
  console.log('🚀 Starting global test setup...');

  try {
    // Wait for infrastructure services
    console.log('⏳ Waiting for services...');
    await waitForServices();
    console.log('✅ Services are ready');

    // Setup Redis with test data
    console.log('📦 Setting up test Redis...');
    await setupTestRedis();
    console.log('✅ Redis setup complete');

    console.log('🎉 Global setup complete!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await closeRedisClient();
  }
}

export default globalSetup;
