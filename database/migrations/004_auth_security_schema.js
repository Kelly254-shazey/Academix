/**
 * Database Schema for Authentication Security
 * Creates tables for login attempts tracking and token blacklisting
 */

async function initializeAuthSecuritySchema(db) {
  try {
    console.log('Initializing authentication security schema...');

    // 1. Login Attempts Table (for rate limiting)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        status ENUM('success', 'failed-user-not-found', 'failed-invalid-password', 'failed-rate-limited', 'failed-inactive-account') NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_status (email, status),
        INDEX idx_created (created_at),
        INDEX idx_ip (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Token Blacklist Table (for logout/invalidation)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        invalidated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (token(100)),
        INDEX idx_created (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Authentication security schema initialized successfully');
    return { success: true };
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✓ Tables already exist');
      return { success: true };
    }
    console.error('Error initializing schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const db = require('../database');
  initializeAuthSecuritySchema(db)
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = initializeAuthSecuritySchema;
