import { closeRedisClient } from '../fixtures/redis.fixture.js';

/**
 * Global teardown for Playwright tests
 *
 * Runs once after all tests complete to clean up resources.
 */
async function globalTeardown(): Promise<void> {
  console.log('🧹 Running global teardown...');

  try {
    await closeRedisClient();
    console.log('✅ Redis connections closed');
    console.log('🎉 Global teardown complete!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - we want tests to report their results even if teardown fails
  }
}

export default globalTeardown;
