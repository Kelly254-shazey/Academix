-- Migration: 001_lecturer_dashboard_schema.sql
-- Description: Add lecturer dashboard tables and extend existing tables
-- Created: December 11, 2025
-- Author: Backend Team

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Extend class_sessions table with lecturer-specific fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scanning_enabled BOOLEAN DEFAULT FALSE AFTER status;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_token VARCHAR(255) UNIQUE AFTER scanning_enabled;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_by INT(11) AFTER session_token;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL AFTER started_by;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS delayed_by INT(11) AFTER started_at;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS delay_reason VARCHAR(500) AFTER delayed_by;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS delayed_at TIMESTAMP NULL AFTER delay_reason;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS new_start_time TIMESTAMP NULL AFTER delayed_at;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancelled_by INT(11) AFTER new_start_time;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500) AFTER cancelled_by;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER cancellation_reason;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS room_change_from VARCHAR(100) AFTER cancelled_at;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS room_change_to VARCHAR(100) AFTER room_change_from;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS room_changed_by INT(11) AFTER room_change_to;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS room_changed_at TIMESTAMP NULL AFTER room_changed_by;

-- Add foreign keys for lecturer actions
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_started_by 
  FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_delayed_by 
  FOREIGN KEY (delayed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_cancelled_by 
  FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_room_changed_by 
  FOREIGN KEY (room_changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Extend attendance_logs for verification tracking
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE AFTER status;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verified_by INT(11) AFTER verified;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verification_time TIMESTAMP NULL AFTER verified_by;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verification_device_id VARCHAR(255) AFTER verification_time;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verification_notes VARCHAR(500) AFTER verification_device_id;

-- Add foreign key for verifier
ALTER TABLE attendance_logs ADD CONSTRAINT fk_attendance_verified_by 
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATE NEW TABLES
-- ============================================================================

-- QR Code Generation & Audit Table
CREATE TABLE IF NOT EXISTS qr_generations (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  session_id INT(11) NOT NULL,
  class_id INT(11) NOT NULL,
  qr_token VARCHAR(255) UNIQUE NOT NULL,
  qr_signature VARCHAR(500) NOT NULL,
  generated_by INT(11) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  scanned_count INT(11) DEFAULT 0,
  is_rotated BOOLEAN DEFAULT FALSE,
  rotation_index INT(11) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_qr_token (qr_token),
  INDEX idx_session_expires (session_id, expires_at),
  INDEX idx_generated_by_date (generated_by, generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT(11),
  class_id INT(11),
  session_id INT(11),
  old_value JSON,
  new_value JSON,
  device_id VARCHAR(255),
  device_fingerprint VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  
  INDEX idx_user_action (user_id, action, action_timestamp),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_class_session (class_id, session_id),
  INDEX idx_action_timestamp (action_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lecturer Attendance Verification Log
CREATE TABLE IF NOT EXISTS lecturer_verifications (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  lecturer_id INT(11) NOT NULL,
  attendance_id INT(11) NOT NULL,
  student_id INT(11) NOT NULL,
  class_id INT(11) NOT NULL,
  session_id INT(11) NOT NULL,
  original_status VARCHAR(20),
  verified_status VARCHAR(20) NOT NULL,
  verification_reason VARCHAR(500),
  verification_notes VARCHAR(1000),
  device_id VARCHAR(255),
  device_fingerprint VARCHAR(500),
  ip_address VARCHAR(45),
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_id) REFERENCES attendance_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  
  INDEX idx_lecturer_class (lecturer_id, class_id),
  INDEX idx_session_verified (session_id, verified_at),
  INDEX idx_student_verified (student_id, verified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lecturer Device Fingerprints (similar to student devices)
CREATE TABLE IF NOT EXISTS lecturer_devices (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  lecturer_id INT(11) NOT NULL,
  device_fingerprint VARCHAR(500) UNIQUE NOT NULL,
  device_name VARCHAR(100),
  device_type VARCHAR(50),
  is_trusted BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_lecturer_device (lecturer_id, device_fingerprint),
  INDEX idx_device_fingerprint (device_fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate Limit Tracking for QR Generation
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_count INT(11) DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  window_end TIMESTAMP,
  ip_address VARCHAR(45),
  status VARCHAR(20) DEFAULT 'allowed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_endpoint (user_id, endpoint),
  INDEX idx_window (window_start, window_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lecturer Alerts & Notifications
CREATE TABLE IF NOT EXISTS lecturer_alerts (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  lecturer_id INT(11) NOT NULL,
  class_id INT(11),
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  related_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  
  INDEX idx_lecturer_read (lecturer_id, is_read),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session Reports & Exports Log
CREATE TABLE IF NOT EXISTS session_reports (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  session_id INT(11) NOT NULL,
  class_id INT(11) NOT NULL,
  lecturer_id INT(11) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  file_path VARCHAR(500),
  file_size INT(11),
  total_students INT(11),
  present_count INT(11),
  absent_count INT(11),
  excused_count INT(11),
  report_data JSON,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_session_report (session_id, report_type),
  INDEX idx_lecturer_generated (lecturer_id, generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance Intervention Tracking
CREATE TABLE IF NOT EXISTS attendance_interventions (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  student_id INT(11) NOT NULL,
  class_id INT(11) NOT NULL,
  lecturer_id INT(11),
  intervention_type VARCHAR(50) NOT NULL,
  current_attendance DECIMAL(5, 2),
  target_attendance DECIMAL(5, 2),
  classes_needed INT(11),
  suggested_action TEXT,
  ai_recommendation JSON,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP NULL,
  intervention_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_student_class (student_id, class_id),
  INDEX idx_intervention_status (intervention_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ADD INDICES FOR PERFORMANCE
-- ============================================================================

-- Sessions table indices
CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON sessions(class_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_lecturer ON sessions(lecturer_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Attendance logs indices
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_logs(session_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_verified ON attendance_logs(verified, verified_by);

-- Notifications table indices (if not exists)
CREATE INDEX IF NOT EXISTS idx_notifications_lecturer ON notifications(user_id, is_read) WHERE user_id IN (
  SELECT id FROM users WHERE role = 'lecturer'
);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample lecturer devices (if needed for testing)
-- INSERT INTO lecturer_devices (lecturer_id, device_fingerprint, device_name, device_type, is_trusted)
-- VALUES 
--   (2, 'device_fp_lecturer_001', 'Office Laptop', 'laptop', TRUE),
--   (2, 'device_fp_lecturer_002', 'iPad', 'tablet', FALSE);

-- ============================================================================
-- VERSION TRACKING
-- ============================================================================

-- Create schema version table if not exists
CREATE TABLE IF NOT EXISTS schema_versions (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(500),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Record this migration
INSERT INTO schema_versions (version, description) 
VALUES ('001_lecturer_dashboard', 'Add lecturer dashboard tables and extend existing tables')
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;
