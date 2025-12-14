#!/usr/bin/env node
/**
 * Database Migration Runner
 * Executes all pending migrations to initialize/update the database schema
 */

const db = require('../backend/database');
const logger = require('../backend/utils/logger');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    logger.info('Starting database migrations');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Create migrations tracking table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending'
      )
    `);

    // Run each migration
    for (const file of migrationFiles) {
      try {
        // Check if migration already ran
        const [existing] = await db.execute(
          'SELECT * FROM migrations WHERE name = ? AND status = ?',
          [file, 'completed']
        );

        if (existing.length > 0) {
          console.log(`✓ Already executed: ${file}`);
          logger.info(`Already executed: ${file}`);
          continue;
        }

        // Execute migration
        const migrationPath = path.join(migrationsDir, file);
        const migration = require(migrationPath);

        console.log(`→ Running migration: ${file}`);
        logger.info(`Running migration: ${file}`);

        if (typeof migration.up === 'function') {
          await migration.up(db);
        } else if (typeof migration.initializeSchema === 'function') {
          await migration.initializeSchema(db);
        }

        // Mark as completed
        await db.execute(
          'INSERT INTO migrations (name, status) VALUES (?, ?)',
          [file, 'completed']
        );

        console.log(`✓ Completed: ${file}`);
        logger.info(`Completed: ${file}`);
      } catch (error) {
        console.error(`✗ Failed: ${file}`);
        console.error(`  Error: ${error.message}`);
        logger.error(`Migration failed: ${file}`, error);

        // Mark as failed
        await db.execute(
          'INSERT INTO migrations (name, status) VALUES (?, ?)',
          [file, 'failed']
        );

        // Continue with next migration or stop based on env
        if (process.env.STOP_ON_MIGRATION_ERROR === 'true') {
          throw error;
        }
      }
    }

    console.log('\n✓ All migrations completed!');
    logger.info('All migrations completed');

    // Show migration summary
    const [summary] = await db.execute(
      'SELECT status, COUNT(*) as count FROM migrations GROUP BY status'
    );

    console.log('\nMigration Summary:');
    for (const row of summary) {
      console.log(`  ${row.status}: ${row.count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    logger.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
