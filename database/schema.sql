-- ClassTrack AI Database Schema

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'lecturer', 'admin') NOT NULL,
  browser_fingerprint VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  lecturer_id INTEGER REFERENCES users(id),
  day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8)
);

CREATE TABLE class_sessions (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id),
  session_date DATE NOT NULL,
  qr_signature VARCHAR(255),
  qr_expires_at TIMESTAMP,
  lecturer_checked_in BOOLEAN DEFAULT FALSE,
  status ENUM('scheduled', 'ongoing', 'cancelled') DEFAULT 'scheduled'
);

CREATE TABLE attendance_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES class_sessions(id),
  student_id INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  browser_fingerprint VARCHAR(255),
  verification_status ENUM('success', 'gps_fail', 'expired', 'spoofed') DEFAULT 'success'
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'unread',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_predictions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id),
  course_id INTEGER REFERENCES classes(id),
  prediction_type VARCHAR(50) NOT NULL,
  value DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX idx_attendance_logs_student_id ON attendance_logs(student_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_ai_predictions_student_id ON ai_predictions(student_id);
