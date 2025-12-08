const pool = require('../../src/config/database');
const schema = require('../schema.sql');

/**
 * Migration Runner
 * Executes database schema creation and initialization
 */
async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
