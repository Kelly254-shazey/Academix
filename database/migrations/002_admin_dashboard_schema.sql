-- Admin Dashboard Schema Migration
-- Date: December 11, 2025
-- Version: 002
-- Description: Complete admin dashboard infrastructure with departments, roles, audit logs, broadcasts, and system configuration

-- Record migration version
INSERT INTO schema_versions (version, description, applied_at) VALUES ('002_admin_dashboard', 'Admin Dashboard Schema', NOW());

-- ============================================================================
-- 1. ADMIN & SUPER-ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role ENUM('super-admin', 'admin', 'system-auditor') NOT NULL,
  department_id INT,
  permissions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  session_ids JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_user_admin (user_id),
  INDEX idx_admin_role (role),
  INDEX idx_admin_active (is_active),
  INDEX idx_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. DEPARTMENTS TABLE (extended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  hod_id INT,
  deputy_hod_id INT,
  faculty_id INT,
  budget_allocation DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT TRUE,
  location VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  
  FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (deputy_hod_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_dept_code (code),
  INDEX idx_dept_active (is_active),
  INDEX idx_dept_hod (hod_id),
  INDEX idx_dept_faculty (faculty_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. ROLE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role ENUM('super-admin', 'admin', 'hod', 'lecturer', 'student', 'system-auditor') NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_role_permission (role, resource, action),
  INDEX idx_role (role),
  INDEX idx_resource (resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ENHANCED AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  actor_role ENUM('super-admin', 'admin', 'hod', 'lecturer', 'student') DEFAULT 'student',
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INT,
  resource_name VARCHAR(255),
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(45),
  device_id VARCHAR(255),
  device_fingerprint VARCHAR(255),
  user_agent TEXT,
  status ENUM('success', 'failure', 'partial') DEFAULT 'success',
  error_message TEXT,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  class_id INT,
  session_id INT,
  department_id INT,
  action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_resource (resource_type, resource_id),
  INDEX idx_audit_timestamp (action_timestamp),
  INDEX idx_audit_severity (severity),
  INDEX idx_audit_department (department_id),
  INDEX idx_audit_ip (ip_address),
  INDEX idx_audit_status (status),
  FULLTEXT INDEX ft_audit_action (action, resource_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BROADCASTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  content_type ENUM('text', 'html', 'json') DEFAULT 'text',
  target_type ENUM('all', 'role', 'department', 'class', 'custom') NOT NULL,
  target_roles JSON,
  target_departments JSON,
  target_users JSON,
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  scheduled_at TIMESTAMP,
  broadcast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_broadcast_date (broadcast_at),
  INDEX idx_broadcast_active (is_active),
  INDEX idx_broadcast_target (target_type),
  INDEX idx_broadcast_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. BROADCAST DELIVERY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcast_delivery (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broadcast_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  delivery_method ENUM('socket', 'email', 'sms', 'push') DEFAULT 'socket',
  delivery_status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
  error_message TEXT,
  
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_delivery_broadcast (broadcast_id),
  INDEX idx_delivery_recipient (recipient_user_id),
  INDEX idx_delivery_status (delivery_status),
  INDEX idx_delivery_date (delivered_at),
  UNIQUE KEY unique_delivery (broadcast_id, recipient_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. EXPORT JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS export_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  requested_by INT NOT NULL,
  export_type ENUM('students', 'lecturers', 'classes', 'attendance', 'departments', 'all_data', 'audit_logs') NOT NULL,
  file_format ENUM('csv', 'xlsx', 'pdf', 'json') DEFAULT 'csv',
  filter_criteria JSON,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  total_records INT,
  processed_records INT DEFAULT 0,
  
  file_path VARCHAR(500),
  file_size INT,
  download_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_job_status (status),
  INDEX idx_job_type (export_type),
  INDEX idx_job_date (created_at),
  INDEX idx_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. DEPARTMENT METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS department_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  metric_date DATE NOT NULL,
  total_students INT DEFAULT 0,
  total_lecturers INT DEFAULT 0,
  total_classes INT DEFAULT 0,
  avg_attendance_percent DECIMAL(5, 2) DEFAULT 0,
  at_risk_students INT DEFAULT 0,
  active_sessions INT DEFAULT 0,
  completed_sessions INT DEFAULT 0,
  cancelled_sessions INT DEFAULT 0,
  avg_class_size INT DEFAULT 0,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_metric (department_id, metric_date),
  INDEX idx_metric_date (metric_date),
  INDEX idx_metric_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. AI JOBS TABLE (ML model training, predictions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  job_type ENUM('prediction', 'training', 'evaluation', 'feature_engineering') NOT NULL,
  model_name VARCHAR(100),
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  
  input_params JSON,
  output_results JSON,
  metrics JSON,
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_completion TIMESTAMP,
  
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_ai_status (status),
  INDEX idx_ai_type (job_type),
  INDEX idx_ai_date (created_at),
  INDEX idx_ai_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. SYSTEM CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_configuration (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSON,
  data_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_config_key (config_key),
  INDEX idx_config_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. INTEGRATION TOKENS TABLE (for SSO, external services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_name VARCHAR(100) NOT NULL,
  integration_type ENUM('sso', 'email', 'sms', 'ai', 'analytics', 'backup') NOT NULL,
  token_encrypted VARCHAR(500),
  refresh_token_encrypted VARCHAR(500),
  expires_at TIMESTAMP,
  scope VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP,
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_integration_name (integration_name),
  INDEX idx_integration_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. STUDENT FLAGS TABLE (at-risk tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  flag_type ENUM('low_attendance', 'poor_performance', 'behavioral', 'financial', 'medical', 'other') NOT NULL,
  severity ENUM('warning', 'critical') DEFAULT 'warning',
  description TEXT,
  recommended_action VARCHAR(255),
  status ENUM('active', 'resolved', 'dismissed') DEFAULT 'active',
  
  flagged_by INT NOT NULL,
  flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INT,
  resolution_notes TEXT,
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_flag_student (student_id),
  INDEX idx_flag_status (status),
  INDEX idx_flag_type (flag_type),
  INDEX idx_flag_date (flagged_at),
  INDEX idx_flag_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. STUDENT TRANSFER REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_transfers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  from_department_id INT NOT NULL,
  to_department_id INT NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_transfer_student (student_id),
  INDEX idx_transfer_status (status),
  INDEX idx_transfer_date (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. PRIVACY REQUESTS TABLE (GDPR compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS privacy_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  request_type ENUM('data_export', 'data_deletion', 'data_portability') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'denied') DEFAULT 'pending',
  
  export_file_path VARCHAR(500),
  export_file_size INT,
  
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_by INT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  expiry_date TIMESTAMP,
  denial_reason TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_privacy_status (status),
  INDEX idx_privacy_user (user_id),
  INDEX idx_privacy_date (requested_at),
  INDEX idx_privacy_type (request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. INSTITUTION SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS institution_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  institution_name VARCHAR(255),
  institution_code VARCHAR(50),
  institution_logo_url VARCHAR(500),
  website VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  
  attendance_threshold_percent INT DEFAULT 75,
  qr_validity_minutes INT DEFAULT 10,
  max_session_delay_minutes INT DEFAULT 480,
  
  enable_ai_predictions BOOLEAN DEFAULT TRUE,
  enable_notifications BOOLEAN DEFAULT TRUE,
  enable_broadcasts BOOLEAN DEFAULT TRUE,
  enable_api_integrations BOOLEAN DEFAULT TRUE,
  
  session_timeout_minutes INT DEFAULT 30,
  max_login_attempts INT DEFAULT 5,
  password_expiry_days INT DEFAULT 90,
  
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_institution (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. SESSION OVERRIDES TABLE (admin session management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_overrides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  override_type ENUM('start', 'cancel', 'reschedule', 'force_end') NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  override_reason TEXT,
  force_parameters JSON,
  
  overridden_by INT NOT NULL,
  overridden_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (overridden_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_override_session (session_id),
  INDEX idx_override_date (overridden_at),
  INDEX idx_override_type (override_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. COURSE ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  lecturer_id INT NOT NULL,
  department_id INT NOT NULL,
  semester INT,
  year INT,
  enrollment_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_assignment (course_id, lecturer_id, semester, year),
  INDEX idx_lecturer_courses (lecturer_id),
  INDEX idx_department_courses (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. BACKUP JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS backup_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  
  tables_included JSON,
  backup_file_path VARCHAR(500),
  backup_file_size BIGINT,
  compression_type VARCHAR(50),
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  error_message TEXT,
  restore_instructions TEXT,
  
  retention_days INT DEFAULT 30,
  expires_at TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_backup_status (status),
  INDEX idx_backup_date (created_at),
  INDEX idx_backup_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Initialize Role Permissions
-- ============================================================================
INSERT INTO role_permissions (role, resource, action, description) VALUES
-- Super Admin - Full access
('super-admin', 'admin_users', 'create', 'Create admin accounts'),
('super-admin', 'admin_users', 'read', 'View admin accounts'),
('super-admin', 'admin_users', 'update', 'Edit admin accounts'),
('super-admin', 'admin_users', 'delete', 'Delete admin accounts'),
('super-admin', 'departments', 'create', 'Create departments'),
('super-admin', 'departments', 'read', 'View departments'),
('super-admin', 'departments', 'update', 'Edit departments'),
('super-admin', 'departments', 'delete', 'Delete departments'),
('super-admin', 'lecturers', 'create', 'Create lecturer accounts'),
('super-admin', 'lecturers', 'read', 'View lecturers'),
('super-admin', 'lecturers', 'update', 'Edit lecturers'),
('super-admin', 'lecturers', 'delete', 'Delete lecturers'),
('super-admin', 'students', 'create', 'Create student accounts'),
('super-admin', 'students', 'read', 'View students'),
('super-admin', 'students', 'update', 'Edit students'),
('super-admin', 'students', 'delete', 'Delete students'),
('super-admin', 'broadcasts', 'create', 'Create broadcasts'),
('super-admin', 'broadcasts', 'read', 'View broadcasts'),
('super-admin', 'broadcasts', 'update', 'Edit broadcasts'),
('super-admin', 'broadcasts', 'delete', 'Delete broadcasts'),
('super-admin', 'audit_logs', 'read', 'View audit logs'),
('super-admin', 'export_jobs', 'create', 'Create exports'),
('super-admin', 'export_jobs', 'read', 'View exports'),
('super-admin', 'system_config', 'read', 'View system configuration'),
('super-admin', 'system_config', 'update', 'Edit system configuration'),
('super-admin', 'privacy_requests', 'read', 'View privacy requests'),
('super-admin', 'privacy_requests', 'update', 'Process privacy requests'),
('super-admin', 'backups', 'create', 'Create backups'),
('super-admin', 'backups', 'read', 'View backups'),
('super-admin', 'backups', 'delete', 'Delete backups'),

-- Admin - Limited management
('admin', 'lecturers', 'read', 'View lecturers'),
('admin', 'lecturers', 'update', 'Edit lecturers'),
('admin', 'students', 'read', 'View students'),
('admin', 'students', 'update', 'Edit students'),
('admin', 'departments', 'read', 'View departments'),
('admin', 'broadcasts', 'create', 'Create broadcasts'),
('admin', 'broadcasts', 'read', 'View broadcasts'),
('admin', 'audit_logs', 'read', 'View audit logs'),
('admin', 'export_jobs', 'create', 'Create exports'),

-- HOD - Department management
('hod', 'lecturers', 'read', 'View lecturers in department'),
('hod', 'students', 'read', 'View students in department'),
('hod', 'audit_logs', 'read', 'View department audit logs'),
('hod', 'broadcasts', 'create', 'Create department broadcasts'),
('hod', 'departments', 'read', 'View own department'),
('hod', 'departments', 'update', 'Edit own department'),

-- Lecturer - Limited read access
('lecturer', 'students', 'read', 'View students in classes'),
('lecturer', 'audit_logs', 'read', 'View own action logs'),
('lecturer', 'broadcasts', 'read', 'View broadcasts'),

-- Student - Minimal access
('student', 'audit_logs', 'read', 'View own data');

-- ============================================================================
-- Initialize Institution Settings
-- ============================================================================
INSERT INTO institution_settings (institution_name, institution_code) VALUES
('Default Institution', 'DEFAULT');
