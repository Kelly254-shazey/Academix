const db = require('../backend/database');
const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/find_user.js user@example.com');
  process.exit(2);
}

(async () => {
  try {
    const [rows] = await db.query('SELECT id,name,email,role,created_at FROM users WHERE email = ?', [email]);
    if (!rows || rows.length === 0) {
      console.log('NOT_FOUND');
      process.exit(0);
    }
    console.log('FOUND');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(3);
  }
})();