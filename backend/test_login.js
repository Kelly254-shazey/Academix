const db = require('./database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('Testing login process...');
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
      ['eva@charity']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('✅ User found:', user.name, user.email);
    
    // Test password
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log('Password test result:', isValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isValid) {
      console.log('Updating password...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, user.id]
      );
      console.log('✅ Password updated');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();