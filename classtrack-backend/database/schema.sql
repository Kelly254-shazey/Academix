/**
 * PostgreSQL Schema for ClassTrack AI
 * Complete database structure with 6 main tables
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
  department_id UUID,
  phone_number VARCHAR(20),
  browser_fingerprint TEXT,
  profile_picture_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department_id ON users(department_id);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_name VARCHAR(255),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  geofence_radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_time CHECK (start_time < end_time)
);

CREATE INDEX idx_classes_lecturer_id ON classes(lecturer_id);
CREATE INDEX idx_classes_course_code ON classes(course_code);
CREATE INDEX idx_classes_day_of_week ON classes(day_of_week);

-- ============================================
-- CLASS_SESSIONS TABLE
-- ============================================
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  lecturer_checked_in BOOLEAN DEFAULT false,
  lecturer_check_in_time TIMESTAMP,
  qr_code_data TEXT, -- Store QR code image as data URI or URL
  qr_expires_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_session_per_day UNIQUE (class_id, session_date)
);

CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX idx_class_sessions_status ON class_sessions(status);
CREATE INDEX idx_class_sessions_session_date ON class_sessions(session_date);

-- ============================================
-- ATTENDANCE_LOGS TABLE
-- ============================================
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gps_distance_meters DECIMAL(10, 2),
  browser_fingerprint TEXT,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (
    verification_status IN ('success', 'gps_fail', 'spoofed', 'expired_qr', 'pending')
  ),
  device_info TEXT, -- Store browser/device details for analysis
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_checkin UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_logs_student_id ON attendance_logs(student_id);
CREATE INDEX idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX idx_attendance_logs_created_at ON attendance_logs(created_at);
CREATE INDEX idx_attendance_logs_verification_status ON attendance_logs(verification_status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('class_cancelled', 'attendance_alert', 'ai_prediction', 'system')),
  status VARCHAR(50) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  data JSONB, -- Store additional notification metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  
  CONSTRAINT notification_type_valid CHECK (title IS NOT NULL AND body IS NOT NULL)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- AI_PREDICTIONS TABLE
-- ============================================
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  prediction_type VARCHAR(100) NOT NULL CHECK (
    prediction_type IN ('absenteeism_risk', 'lecturer_punctuality', 'anomaly_detection', 'trend_analysis')
  ),
  prediction_value DECIMAL(10, 2),
  risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(5, 2), -- Confidence score 0-100
  metadata JSONB, -- Store model parameters and additional details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_confidence CHECK (confidence BETWEEN 0 AND 100)
);

CREATE INDEX idx_ai_predictions_student_id ON ai_predictions(student_id);
CREATE INDEX idx_ai_predictions_prediction_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at);
CREATE INDEX idx_ai_predictions_risk_level ON ai_predictions(risk_level);

-- ============================================
-- ENROLLMENT TABLE (Students per Class)
-- ============================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_enrollment UNIQUE (student_id, class_id)
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Attendance Summary View
CREATE OR REPLACE VIEW attendance_summary_view AS
SELECT 
  u.id as student_id,
  u.name as student_name,
  c.id as class_id,
  c.course_name,
  c.course_code,
  COUNT(DISTINCT cs.id) as total_sessions,
  COUNT(DISTINCT al.id) as attended_sessions,
  ROUND(COUNT(DISTINCT al.id) * 100.0 / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage,
  COUNT(CASE WHEN al.verification_status = 'success' THEN 1 END) as verified_present,
  COUNT(CASE WHEN al.verification_status = 'gps_fail' THEN 1 END) as gps_failures,
  COUNT(CASE WHEN al.verification_status = 'spoofed' THEN 1 END) as spoofed_attempts
FROM users u
JOIN enrollments e ON u.id = e.student_id
JOIN classes c ON e.class_id = c.id
LEFT JOIN class_sessions cs ON c.id = cs.class_id
LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, c.id;

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER classes_timestamp BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER class_sessions_timestamp BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert test users
INSERT INTO users (name, email, password_hash, role, phone_number) VALUES
  ('Dr. John Smith', 'john.smith@university.edu', '$2b$10$placeholder_hash_1', 'lecturer', '+1234567890'),
  ('Jane Doe', 'jane.doe@student.university.edu', '$2b$10$placeholder_hash_2', 'student', '+1234567891'),
  ('Admin User', 'admin@university.edu', '$2b$10$placeholder_hash_3', 'admin', '+1234567892')
ON CONFLICT (email) DO NOTHING;

-- Insert sample class
INSERT INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_name, location_lat, location_lng) 
SELECT c.id, 'CS101', 'Introduction to Computer Science', u.id, 1, '09:00:00'::time, '10:30:00'::time, 'Room 101', 40.7128, -74.0060
FROM users u CROSS JOIN (SELECT 1) c
WHERE u.email = 'john.smith@university.edu'
ON CONFLICT DO NOTHING;
