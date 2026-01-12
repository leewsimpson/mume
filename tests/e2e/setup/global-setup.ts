import { createTestDatabase, runMigrations, resetDatabase, seedTestUsers, closePool } from '../fixtures/database.fixture.js';
import { waitForServices } from '../utils/wait-for-services.js';

/**
 * Global setup for Playwright tests
 *
 * Runs once before all tests to prepare the test environment:
 * 1. Wait for Docker services (PostgreSQL, Redis) to be ready
 * 2. Create test database if needed
 * 3. Run migrations
 * 4. Seed test data
 */
async function globalSetup(): Promise<void> {
  console.log('🚀 Starting global test setup...');

  try {
    // Wait for infrastructure services
    console.log('⏳ Waiting for services...');
    await waitForServices();
    console.log('✅ Services are ready');

    // Setup database
    console.log('📦 Setting up test database...');
    await createTestDatabase();
    await runMigrations();
    await resetDatabase();
    await seedTestUsers();
    console.log('✅ Database setup complete');

    console.log('🎉 Global setup complete!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

export default globalSetup;
