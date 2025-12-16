const mysql = require('mysql2/promise');

async function createAdminTables() {
  let connection;
  try {
    console.log('🔄 Creating admin-specific tables...');

    // Create connection with auth method
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'academix',
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      }
    });

    // Create tables one by one
    const tables = [
      {
        name: 'complaints',
        sql: `CREATE TABLE IF NOT EXISTS complaints (
          id INT PRIMARY KEY AUTO_INCREMENT,
          message TEXT NOT NULL,
          category ENUM('academic', 'facility', 'staff', 'system', 'other') DEFAULT 'other',
          status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
          priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
          anonymous BOOLEAN DEFAULT TRUE,
          student_id INT NULL,
          assigned_to INT NULL,
          resolution_notes TEXT NULL,
          resolved_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'admin_reports',
        sql: `CREATE TABLE IF NOT EXISTS admin_reports (
          id INT PRIMARY KEY AUTO_INCREMENT,
          admin_id INT NOT NULL,
          type ENUM('general', 'incident', 'performance', 'resource', 'urgent') DEFAULT 'general',
          subject VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
          priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
          reviewed_by INT NULL,
          reviewed_at TIMESTAMP NULL,
          response TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'department_issues',
        sql: `CREATE TABLE IF NOT EXISTS department_issues (
          id INT PRIMARY KEY AUTO_INCREMENT,
          department VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
          status ENUM('pending', 'in-progress', 'resolved', 'cancelled') DEFAULT 'pending',
          created_by INT NOT NULL,
          assigned_to INT NULL,
          due_date DATE NULL,
          resolution_notes TEXT NULL,
          resolved_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'communications',
        sql: `CREATE TABLE IF NOT EXISTS communications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sender_id INT NOT NULL,
          recipient_role ENUM('students', 'lecturers', 'admins', 'all') NOT NULL,
          message_type ENUM('broadcast', 'alert', 'announcement', 'notification') DEFAULT 'broadcast',
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'communication_recipients',
        sql: `CREATE TABLE IF NOT EXISTS communication_recipients (
          id INT PRIMARY KEY AUTO_INCREMENT,
          communication_id INT NOT NULL,
          recipient_id INT NOT NULL,
          delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP NULL,
          is_read BOOLEAN DEFAULT FALSE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NULL,
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NULL,
          resource_id INT NULL,
          description TEXT NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          metadata JSON NULL,
          severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      {
        name: 'admin_settings',
        sql: `CREATE TABLE IF NOT EXISTS admin_settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          admin_id INT NOT NULL UNIQUE,
          notifications BOOLEAN DEFAULT TRUE,
          auto_refresh BOOLEAN DEFAULT FALSE,
          theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
          language VARCHAR(10) DEFAULT 'en',
          timezone VARCHAR(50) DEFAULT 'UTC',
          email_notifications BOOLEAN DEFAULT TRUE,
          dashboard_layout JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      }
    ];

    for (const table of tables) {
      try {
        await connection.execute(table.sql);
        console.log(`✅ Created table: ${table.name}`);
      } catch (err) {
        console.log(`⚠️  Table ${table.name} already exists or error: ${err.message}`);
      }
    }

    console.log('✅ All admin tables processed successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create admin tables:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminTables().then(() => {
  console.log('🎉 Migration completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Migration failed:', err.message);
  process.exit(1);
});