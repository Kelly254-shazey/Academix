const db = require('../backend/database');

(async () => {
  try {
    // Check if users table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'users'");
    if (!tables || tables.length === 0) {
      console.log('TABLE_MISSING');
      process.exit(0);
    }

    console.log('TABLE_EXISTS');
    const [cols] = await db.query('DESCRIBE users');
    console.log('COLUMNS:');
    cols.forEach(c => console.log(`- ${c.Field} (${c.Type})`));
    process.exit(0);
  } catch (err) {
    console.error('DB_CHECK_ERROR', err.message || err);
    process.exit(2);
  }
})();