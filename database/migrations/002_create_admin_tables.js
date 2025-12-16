const db = require('../../backend/database');

async function createAdminTables() {
  try {
    console.log('🔄 Creating admin-specific tables...');

    // ============================================================
    // TABLE 1: COMPLAINTS (Anonymous student complaints)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_created (created_at),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 2: ADMIN_REPORTS (Reports to super admin)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_reports (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 3: DEPARTMENT_ISSUES (Department management)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS department_issues (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_department (department),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 4: COMMUNICATIONS (System messages)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS communications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        recipient_role ENUM('students', 'lecturers', 'admins', 'all') NOT NULL,
        message_type ENUM('broadcast', 'alert', 'announcement', 'notification') DEFAULT 'broadcast',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_recipient_role (recipient_role),
        INDEX idx_message_type (message_type),
        INDEX idx_sent_at (sent_at),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 5: COMMUNICATION_RECIPIENTS (Message delivery tracking)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS communication_recipients (
        id INT PRIMARY KEY AUTO_INCREMENT,
        communication_id INT NOT NULL,
        recipient_id INT NOT NULL,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP NULL,
        is_read BOOLEAN DEFAULT FALSE,
        INDEX idx_communication (communication_id),
        INDEX idx_recipient (recipient_id),
        INDEX idx_read_status (is_read),
        FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_comm_recipient (communication_id, recipient_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 6: AUDIT_LOGS (System audit trail)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_resource (resource),
        INDEX idx_timestamp (timestamp),
        INDEX idx_severity (severity),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 7: ADMIN_SETTINGS (Admin preferences)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_settings (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Admin tables created successfully!');
    console.log('✅ Tables: complaints, admin_reports, department_issues, communications, communication_recipients, audit_logs, admin_settings');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create admin tables:', error.message);
    throw error;
  }
}

module.exports = { createAdminTables };