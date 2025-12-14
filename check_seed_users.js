const db = require('./backend/database');

(async () => {
  try {
    const [users] = await db.execute("SELECT id, name, email, role FROM users WHERE email LIKE '%@example.com%'");
    console.log('Seed users in database:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
