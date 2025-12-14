const db = require('./backend/database');

(async () => {
  try {
    const [users] = await db.execute('SELECT id, name, email, role FROM users LIMIT 10');
    console.log('Users in database:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
