const db = require('./backend/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // First check if the user exists
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", ['eva@charity']);
    
    if (existing.length > 0) {
      console.log('User eva@charity already exists with ID:', existing[0].id);
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert the user
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash, role, student_id, department) VALUES (?, ?, ?, ?, ?, ?)",
      ['Eva Charity', 'eva@charity', hashedPassword, 'student', 'STU001', 'Computer Science']
    );

    console.log('User created successfully!');
    console.log('Email: eva@charity');
    console.log('Password: password123');
    console.log('User ID:', result.insertId);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
