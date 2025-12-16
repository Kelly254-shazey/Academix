const db = require('./database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const email = 'lecturer@test.com';
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing user if exists
    await db.execute("DELETE FROM users WHERE email = ?", [email]);

    // Insert lecturer user
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash, role, department, employee_id) VALUES (?, ?, ?, ?, ?, ?)",
      ['Dr. Smith', email, hashedPassword, 'lecturer', 'Computer Science', `LEC${Date.now()}`]
    );

    console.log('✅ Lecturer created:');
    console.log('Email: lecturer@test.com');
    console.log('Password: 123');
    console.log('Role: lecturer');
    console.log('User ID:', result.insertId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();