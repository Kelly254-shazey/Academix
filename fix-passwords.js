const db = require('./backend/database');
const bcrypt = require('./backend/node_modules/bcryptjs');

async function fixPasswords() {
  try {
    console.log('Fixing user passwords...');

    // Hash the correct password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Update all user passwords
    await db.execute('UPDATE users SET password_hash = ?', [hashedPassword]);

    console.log('Passwords updated successfully!');
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    process.exit(0);
  }
}

fixPasswords();