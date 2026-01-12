import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/markdown_editor',
});

/**
 * Run all pending migrations in order
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'db', 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    for (const filename of migrationFiles) {
      const migrationName = filename.replace('.sql', '');

      // Check if migration already applied
      const result = await client.query(
        'SELECT * FROM migrations WHERE name = $1',
        [migrationName]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping migration: ${filename} (already applied)`);
        continue;
      }

      // Read and execute migration
      const migrationPath = path.join(migrationsDir, filename);
      const sql = await readFile(migrationPath, 'utf-8');

      console.log(`▶️  Running migration: ${filename}`);
      await client.query(sql);

      // Record migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );

      console.log(`✓ Migration ${filename} completed`);
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
const isMainModule = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule) {
  runMigrations()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
