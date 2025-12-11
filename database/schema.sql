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

-- Sample Data (Optional, for quick testing)
-- Note: Hashed password for 'password123'
INSERT INTO users (name, email, password_hash, role, student_id) VALUES ('John Student', 'student@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'student', 'STU001');
INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ('Jane Lecturer', 'lecturer@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'lecturer', 'EMP001');
INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ('Jack Admin', 'admin@university.edu', '$2a$10$k.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL8i5J8i.gL8e.wS.a.m4gL', 'admin', 'ADM001');

INSERT INTO admin_messages (student_id, sender_id, sender_type, message, is_read) VALUES (1, '1', 'student', 'Hello Admin, I have a question about my attendance.', 0);
INSERT INTO admin_messages (student_id, sender_id, sender_type, message, is_read) VALUES (1, '3', 'admin', 'Hi John, how can I help?', 1);