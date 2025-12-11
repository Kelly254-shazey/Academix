const db = require('../backend/database');
(async () => {
  try {
    const [rows] = await db.query('SELECT id, email FROM users ORDER BY id DESC LIMIT 1');
    if (!rows || rows.length === 0) {
      console.log('NO_USERS');
      process.exit(0);
    }
    console.log(JSON.stringify(rows[0]));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  }
})();