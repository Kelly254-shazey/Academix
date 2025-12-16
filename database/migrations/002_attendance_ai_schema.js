

async function initializeSchema(db) {
  try {
    console.log('Initializing attendance system schema...');

    // 1. QR Tokens Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS qr_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_session_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        token_hash VARCHAR(256) NOT NULL UNIQUE,
        nonce VARCHAR(32) NOT NULL,
        issued_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        invalidated_at TIMESTAMP NULL,
        status ENUM('active', 'used', 'expired', 'invalidated') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_lecturer (class_session_id, lecturer_id),
        INDEX idx_status (status),
        INDEX idx_expires (expires_at),
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Attendance Scans Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_scans (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_session_id INT NOT NULL,
        student_id INT NOT NULL,
        lecturer_id INT NULL,
        scan_time TIMESTAMP NOT NULL,
        ip_address VARCHAR(45) NULL,
        device_hash VARCHAR(256) NULL,
        device_fingerprint VARCHAR(256) NULL,
        user_agent TEXT NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        distance_from_classroom DECIMAL(10, 2) NULL,
        risk_score INT DEFAULT 0,
        risk_level ENUM('minimal', 'low', 'medium', 'high', 'critical') DEFAULT 'low',
        status ENUM('pending', 'verified', 'flagged', 'rejected') DEFAULT 'pending',
        verification_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_student (class_session_id, student_id),
        INDEX idx_student (student_id),
        INDEX idx_status (status),
        INDEX idx_risk_score (risk_score),
        INDEX idx_scan_time (scan_time),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Add columns to existing class_sessions table if needed
    await db.execute(`
      ALTER TABLE class_sessions
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL,
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL,
      ADD COLUMN IF NOT EXISTS qr_expiry TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS attendance_status ENUM('closed', 'open') DEFAULT 'closed'
    `).catch(() => {
      console.log('Class sessions table already has required columns');
    });

    // 4. AI Risk Scores Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_risk_scores (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        class_session_id INT NOT NULL,
        attendance_scan_id INT NULL,
        overall_score INT NOT NULL,
        risk_level ENUM('minimal', 'low', 'medium', 'high', 'critical') NOT NULL,
        device_risk INT DEFAULT 0,
        location_risk INT DEFAULT 0,
        network_risk INT DEFAULT 0,
        temporal_risk INT DEFAULT 0,
        anomaly_risk INT DEFAULT 0,
        device_hash VARCHAR(256) NULL,
        ip_address VARCHAR(45) NULL,
        flags JSON NULL,
        recommendations JSON NULL,
        reviewed_by INT NULL,
        review_notes TEXT NULL,
        action_taken ENUM('none', 'warning', 'suspension', 'investigation') DEFAULT 'none',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_session (student_id, class_session_id),
        INDEX idx_risk_level (risk_level),
        INDEX idx_score (overall_score),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (attendance_scan_id) REFERENCES attendance_scans(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Audit Logs Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        class_session_id INT NULL,
        event_data JSON NOT NULL,
        ip_address VARCHAR(45) NULL,
        device_hash VARCHAR(256) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_event (student_id, event_type),
        INDEX idx_event_type (event_type),
        INDEX idx_created (created_at),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Student Behavior Patterns Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_behavior_patterns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        class_id INT NOT NULL,
        typical_device_hash VARCHAR(256) NULL,
        typical_ip_address VARCHAR(45) NULL,
        typical_location_lat DECIMAL(10, 8) NULL,
        typical_location_lon DECIMAL(11, 8) NULL,
        typical_arrival_minutes_before_start INT DEFAULT 5,
        attendance_consistency_score DECIMAL(5, 2) DEFAULT 0,
        anomaly_detection_enabled BOOLEAN DEFAULT TRUE,
        last_analyzed TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_class (student_id, class_id),
        INDEX idx_student (student_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Timetable Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS timetables (
        id INT PRIMARY KEY AUTO_INCREMENT,
        institution_id INT NULL,
        semester VARCHAR(20) NOT NULL,
        academic_year VARCHAR(9) NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        import_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        import_error TEXT NULL,
        total_sessions_imported INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (import_status),
        INDEX idx_uploaded_by (uploaded_by),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Notification Preferences Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        student_notifications BOOLEAN DEFAULT TRUE,
        class_reminders BOOLEAN DEFAULT TRUE,
        attendance_opened_alert BOOLEAN DEFAULT TRUE,
        attendance_missed_warning BOOLEAN DEFAULT TRUE,
        lecturer_notifications BOOLEAN DEFAULT TRUE,
        low_attendance_alerts BOOLEAN DEFAULT TRUE,
        late_attendance_alerts BOOLEAN DEFAULT TRUE,
        anomaly_alerts BOOLEAN DEFAULT TRUE,
        notification_method ENUM('email', 'push', 'both') DEFAULT 'both',
        preferred_time_before_class INT DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. Alerts & Flags Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_alerts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        alert_type ENUM('location_mismatch', 'device_change', 'suspicious_activity', 'impossible_movement', 'vpn_detected') NOT NULL,
        class_session_id INT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        description TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by INT NULL,
        resolution_notes TEXT NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_type (student_id, alert_type),
        INDEX idx_severity (severity),
        INDEX idx_resolved (resolved),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Schema initialization completed successfully');
    return { success: true, message: 'Schema initialized' };
  } catch (error) {
    console.error('✗ Error initializing schema:', error);
    throw error;
  }
}

// Export for migration/setup
module.exports = {
  initializeSchema
};

// Allow direct execution
if (require.main === module) {
  const db = require('../../backend/database');
  initializeSchema(db).then(() => {
    console.log('✅ All tables created successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  });
}
