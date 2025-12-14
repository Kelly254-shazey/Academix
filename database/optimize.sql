-- Database Optimization Script for ClassTrack AI
-- Add performance indexes for dashboard queries and common lookups

USE class_ai_db;

-- Indexes for user lookups
CREATE INDEX idx_users_role_email ON users(role, email);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Indexes for class queries
CREATE INDEX idx_classes_lecturer_id ON classes(lecturer_id);
CREATE INDEX idx_classes_day_time ON classes(day_of_week, start_time);
CREATE INDEX idx_classes_course_code ON classes(course_code);

-- Indexes for session queries
CREATE INDEX idx_class_sessions_class_date ON class_sessions(class_id, session_date);
CREATE INDEX idx_class_sessions_active ON class_sessions(is_active);
CREATE INDEX idx_class_sessions_qr_expires ON class_sessions(qr_expires_at);

-- Indexes for attendance logs (critical for performance)
CREATE INDEX idx_attendance_logs_student_session ON attendance_logs(student_id, session_id);
CREATE INDEX idx_attendance_logs_session_time ON attendance_logs(session_id, checkin_time);
CREATE INDEX idx_attendance_logs_student_time ON attendance_logs(student_id, checkin_time);
CREATE INDEX idx_attendance_logs_verification ON attendance_logs(verification_status);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Indexes for AI predictions
CREATE INDEX idx_ai_predictions_student_date ON ai_predictions(student_id, prediction_date);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);

-- Composite indexes for complex dashboard queries
CREATE INDEX idx_classes_sessions_attendance ON classes(id) INCLUDE (course_code, course_name, lecturer_id);
CREATE INDEX idx_sessions_attendance_logs ON class_sessions(id, class_id) INCLUDE (session_date, qr_expires_at);

-- Add foreign key constraints if missing
-- (These should already exist from schema.sql, but ensuring they're present)
ALTER TABLE classes ADD CONSTRAINT fk_classes_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE class_sessions ADD CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE attendance_logs ADD CONSTRAINT fk_attendance_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE;
ALTER TABLE attendance_logs ADD CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ai_predictions ADD CONSTRAINT fk_predictions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;