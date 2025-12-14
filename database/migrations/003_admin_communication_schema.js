/**
 * Database Schema for Admin Real-Time Communication
 * Creates tables for admin messages, alerts, and communication logs
 */

async function initializeAdminCommunicationSchema(db) {
  try {
    console.log('Initializing admin communication schema...');

    // 1. Admin Messages Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        recipient_type ENUM('user', 'role', 'all') NOT NULL,
        recipient_id INT NULL,
        recipient_role VARCHAR(50) NULL,
        message LONGTEXT NOT NULL,
        message_type ENUM('info', 'warning', 'announcement', 'urgent') DEFAULT 'info',
        priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
        status ENUM('sent', 'read', 'archived') DEFAULT 'sent',
        read_at TIMESTAMP NULL,
        read_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_recipient (recipient_type, recipient_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (read_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Lecturer Alerts Table (for attendance-specific alerts)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lecturer_alerts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lecturer_id INT NOT NULL,
        class_session_id INT NOT NULL,
        student_id INT NOT NULL,
        alert_type ENUM('suspicious_activity', 'low_attendance', 'missed_class', 'system_alert') DEFAULT 'suspicious_activity',
        severity ENUM('info', 'warning', 'critical') DEFAULT 'warning',
        alert_message TEXT,
        status ENUM('unread', 'read', 'acknowledged', 'resolved') DEFAULT 'unread',
        acknowledged_at TIMESTAMP NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lecturer (lecturer_id),
        INDEX idx_session (class_session_id),
        INDEX idx_student (student_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. System Alerts Table (critical system-wide alerts)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        severity ENUM('info', 'warning', 'critical') DEFAULT 'warning',
        message TEXT NOT NULL,
        affected_users JSON,
        status ENUM('active', 'resolved', 'archived') DEFAULT 'active',
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_severity (severity),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Admin Alerts Log (communication audit trail)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_alerts_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        class_session_id INT,
        message TEXT,
        alert_type VARCHAR(100),
        severity ENUM('info', 'warning', 'critical') DEFAULT 'warning',
        status ENUM('sent', 'read', 'acknowledged') DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id),
        INDEX idx_lecturer (lecturer_id),
        INDEX idx_session (class_session_id),
        INDEX idx_created (created_at),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Communication Audit Log (all communication events)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS communication_audit_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        sender_role VARCHAR(50),
        recipient_id INT,
        recipient_role VARCHAR(50),
        communication_type ENUM('direct_message', 'broadcast', 'alert', 'notification') DEFAULT 'direct_message',
        event_type ENUM('sent', 'received', 'read', 'failed', 'pending') DEFAULT 'sent',
        event_data JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_recipient (recipient_id),
        INDEX idx_type (communication_type),
        INDEX idx_event (event_type),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. User Notification Preferences (for fine-grained control)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        receive_admin_messages BOOLEAN DEFAULT 1,
        receive_alerts BOOLEAN DEFAULT 1,
        receive_announcements BOOLEAN DEFAULT 1,
        alert_on_suspicious_activity BOOLEAN DEFAULT 1,
        alert_on_low_attendance BOOLEAN DEFAULT 1,
        alert_on_missed_class BOOLEAN DEFAULT 1,
        real_time_notifications BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Admin communication schema initialized successfully');
    return { success: true, message: 'Admin communication schema created' };
  } catch (error) {
    console.error('Error initializing admin communication schema:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const db = require('../database');
  initializeAdminCommunicationSchema(db)
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = initializeAdminCommunicationSchema;
