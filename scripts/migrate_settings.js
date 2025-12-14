const db = require('../backend/database');

async function runMigration() {
  try {
    console.log('Running settings migration...');

    const migrationSQL = `
      ALTER TABLE user_settings
      ADD COLUMN class_reminders BOOLEAN DEFAULT TRUE,
      ADD COLUMN attendance_alerts BOOLEAN DEFAULT TRUE,
      ADD COLUMN system_updates BOOLEAN DEFAULT FALSE,
      ADD COLUMN theme VARCHAR(20) DEFAULT 'light',
      ADD COLUMN language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
      ADD COLUMN time_format VARCHAR(10) DEFAULT '12h',
      ADD COLUMN profile_visibility VARCHAR(20) DEFAULT 'private',
      ADD COLUMN attendance_visibility VARCHAR(20) DEFAULT 'private',
      ADD COLUMN data_sharing BOOLEAN DEFAULT FALSE;
    `;

    await db.execute(migrationSQL);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    process.exit();
  }
}

runMigration();