const db = require('./database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Create a simple test user
    const email = 'test@test.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing user if exists
    await db.execute("DELETE FROM users WHERE email = ?", [email]);

    // Insert new user
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash, role, student_id, department) VALUES (?, ?, ?, ?, ?, ?)",
      ['Test User', email, hashedPassword, 'student', 'TEST001', 'Computer Science']
    );

    console.log('✅ Test user created:');
    console.log('Email: test@test.com');
    console.log('Password: test123');
    console.log('User ID:', result.insertId);
    
    // Verify user exists
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    console.log('✅ User verified in database:', users[0].name);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();