-- Active: 1704104270000@@127.0.0.1@3306@classtrack_ai_db
-- Active: 1704104270000@@127.0.0.1@3306@class_ai_db
-- MySQL Schema for ClassTrack AI

-- Drop existing database if it exists and create a new one
DROP DATABASE IF EXISTS class_ai_db;
CREATE DATABASE class_ai_db;
USE class_ai_db;

-- Table for Users (Students, Lecturers, Admins)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer', 'admin') NOT NULL,
    student_id VARCHAR(50) UNIQUE NULL, -- For students
    employee_id VARCHAR(50) UNIQUE NULL, -- For lecturers/admins
    department VARCHAR(255) NULL,
    avatar VARCHAR(255) NULL,
    fingerprint_hash VARCHAR(255) NULL, -- For browser fingerprint binding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_email (email)
);

-- Table for Classes
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    lecturer_id INT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location_lat DECIMAL(10, 8) NULL,
    location_lng DECIMAL(11, 8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table for Class Sessions (instances of a class)
CREATE TABLE class_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    session_date DATE NOT NULL,
    qr_signature_hash VARCHAR(255) NULL, -- Hash of the QR token for validation
    qr_expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Table for Attendance Logs
CREATE TABLE attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    captured_lat DECIMAL(10, 8) NULL,
    captured_lng DECIMAL(11, 8) NULL,
    captured_fingerprint VARCHAR(255) NULL,
    verification_status ENUM('success', 'late', 'absent', 'spoofed_location', 'invalid_fingerprint', 'expired_qr') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (session_id, student_id) -- A student can only check into a session once
);

-- Table for Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'class_alert', 'attendance_warning', 'message'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for AI Predictions
CREATE TABLE ai_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    prediction_type VARCHAR(100) NOT NULL, -- e.g., 'absenteeism_risk', 'punctuality_score', 'anomaly_detection'
    prediction_value JSON NULL, -- Store prediction results as JSON
    prediction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Admin-Student Messages
CREATE TABLE admin_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    sender_type ENUM('student', 'admin') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_created_at (created_at)
);

-- Table for Student Profiles
CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    bio TEXT NULL,
    avatar_url VARCHAR(500) NULL,
    phone VARCHAR(20) NULL,
    verified_at TIMESTAMP NULL,
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Verified Devices
CREATE TABLE verified_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id)
);

-- Table for User Settings
CREATE TABLE user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    dark_mode BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Support Tickets
CREATE TABLE support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'attendance', 'technical', 'general'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_student_id (student_id)
);

-- Table for Support Ticket Responses
CREATE TABLE support_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    responder_id INT NOT NULL,
    response_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Admin-only notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Gamification (Achievements)
CREATE TABLE badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url VARCHAR(500) NULL,
    requirement_type VARCHAR(50) NOT NULL, -- e.g., 'attendance_streak', 'perfect_attendance', 'perfect_punctuality'
    requirement_value INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Student Badge Progress
CREATE TABLE student_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP NULL,
    progress INT DEFAULT 0, -- Current progress toward badge
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE(student_id, badge_id)
);

-- Table for Attendance Streaks
CREATE TABLE attendance_streaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    last_attendance_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, course_id)
);

-- Table for Calendar Events
CREATE TABLE calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_type ENUM('class', 'exam', 'academic_activity', 'holiday') NOT NULL,
    class_id INT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    location VARCHAR(255) NULL,
    description TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_event_type (event_type),
    INDEX idx_start_date (start_date)
);

-- Table for Course Analytics
CREATE TABLE course_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    total_sessions INT DEFAULT 0,
    average_attendance_percent DECIMAL(5, 2) DEFAULT 0,
    total_students_enrolled INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(class_id)
);

-- Table for Student Attendance Analytics
CREATE TABLE student_attendance_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    total_sessions INT DEFAULT 0,
    attended INT DEFAULT 0,
    attendance_percent DECIMAL(5, 2) DEFAULT 0,
    is_at_risk BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id)
);

-- Table for Active User Sessions
CREATE TABLE active_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Sample Data (Optional, for quick testing)
-- Note: Hashed password for 'password123'
INSERT INTO users (name, email, password_hash, role, student_id) VALUES ('John Student', 'student@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'student', 'STU001');
INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ('Jane Lecturer', 'lecturer@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'lecturer', 'EMP001');
INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ('Jack Admin', 'admin@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'admin', 'ADM001');

INSERT INTO admin_messages (student_id, sender_id, sender_type, message, is_read) VALUES (1, '1', 'student', 'Hello Admin, I have a question about my attendance.', 0);
INSERT INTO admin_messages (student_id, sender_id, sender_type, message, is_read) VALUES (1, '3', 'admin', 'Hi John, how can I help?', 1);

-- Insert sample badges
INSERT INTO badges (name, description, icon_url, requirement_type, requirement_value) VALUES
('Perfect Attendee', 'Achieved 100% attendance for a course', '/badges/perfect-attendee.png', 'perfect_attendance', 100),
('Streak Master', 'Maintained a 10-day attendance streak', '/badges/streak-master.png', 'attendance_streak', 10),
('Punctuality Pro', 'Never late for 30 consecutive classes', '/badges/punctuality.png', 'perfect_punctuality', 30),
('Consistent Scholar', 'Completed entire semester with 90%+ attendance', '/badges/consistent.png', 'semester_attendance', 90);