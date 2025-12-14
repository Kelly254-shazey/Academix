/**
 * Base Schema Migration - Creates all foundational tables
 * CRITICAL: This migration must run before any other migrations
 * Tables: users, classes, course_enrollments, class_sessions, attendance_logs, notifications
 */

async function initializeBaseSchema(db) {
  try {
    console.log('🟢 STEP 1: Creating base database schema...');

    // ============================================================
    // TABLE 1: USERS (Core user table - foundational)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        role ENUM('student', 'lecturer', 'admin', 'learner', 'pupil') NOT NULL DEFAULT 'student',
        student_id VARCHAR(100) UNIQUE NULL,
        department VARCHAR(100) NULL,
        avatar VARCHAR(500) NULL,
        avatar_url VARCHAR(500) NULL,
        bio TEXT NULL,
        date_of_birth DATE NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_email (email),
        UNIQUE KEY unique_student_id (student_id),
        INDEX idx_role (role),
        INDEX idx_is_active (is_active),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 2: CLASSES (Course/Class definitions)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        class_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT NULL,
        course_code VARCHAR(50) NULL,
        course_name VARCHAR(255) NULL,
        credits INT NULL,
        max_students INT DEFAULT 50,
        enrolled_students INT DEFAULT 0,
        lecturer_id INT NOT NULL,
        department VARCHAR(100) NULL,
        location VARCHAR(255) NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lecturer (lecturer_id),
        INDEX idx_status (status),
        INDEX idx_course_code (course_code),
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 3: COURSE_ENROLLMENTS (Student enrollment in classes)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        student_id INT NOT NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completion_status ENUM('enrolled', 'completed', 'dropped', 'suspended') DEFAULT 'enrolled',
        grade VARCHAR(2) NULL,
        final_score DECIMAL(5, 2) NULL,
        attendance_count INT DEFAULT 0,
        total_classes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_enrollment (class_id, student_id),
        INDEX idx_student (student_id),
        INDEX idx_class (class_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 4: CLASS_SESSIONS (Individual class sessions/lectures)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS class_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        date DATE NOT NULL,
        day_of_week VARCHAR(20) NULL,
        topic VARCHAR(255) NULL,
        description TEXT NULL,
        location VARCHAR(255) NULL,
        classroom VARCHAR(100) NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        qr_code TEXT NULL,
        qr_expiry TIMESTAMP NULL,
        status ENUM('scheduled', 'open', 'closed', 'cancelled') DEFAULT 'scheduled',
        attendance_status ENUM('open', 'closed') DEFAULT 'closed',
        total_students_expected INT DEFAULT 0,
        attendance_marked INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_class (class_id),
        INDEX idx_lecturer (lecturer_id),
        INDEX idx_date (date),
        INDEX idx_status (status),
        INDEX idx_start_time (start_time),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 5: ATTENDANCE_LOGS (Student attendance records)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_session_id INT NOT NULL,
        student_id INT NOT NULL,
        lecturer_id INT NULL,
        checkin_time TIMESTAMP NOT NULL,
        checkout_time TIMESTAMP NULL,
        ip_address VARCHAR(45) NULL,
        device_hash VARCHAR(256) NULL,
        device_fingerprint VARCHAR(256) NULL,
        user_agent TEXT NULL,
        captured_lat DECIMAL(10, 8) NULL,
        captured_lng DECIMAL(11, 8) NULL,
        captured_fingerprint VARCHAR(256) NULL,
        distance_from_classroom DECIMAL(10, 2) NULL,
        verification_status ENUM('pending', 'verified', 'flagged', 'rejected') DEFAULT 'pending',
        verification_notes TEXT NULL,
        status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
        marked_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_student (class_session_id, student_id),
        INDEX idx_student (student_id),
        INDEX idx_status (status),
        INDEX idx_checkin_time (checkin_time),
        FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 6: NOTIFICATIONS (System notifications)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('alert', 'system', 'general', 'announcement', 'message') DEFAULT 'general',
        link VARCHAR(500) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_status BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
        source VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student (student_id),
        INDEX idx_is_read (is_read),
        INDEX idx_type (type),
        INDEX idx_created (created_at),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 7: STUDENT_PROFILES (Extended student information)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL UNIQUE,
        bio TEXT NULL,
        phone VARCHAR(20) NULL,
        date_of_birth DATE NULL,
        address TEXT NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        zip_code VARCHAR(20) NULL,
        country VARCHAR(100) NULL,
        guardian_name VARCHAR(255) NULL,
        guardian_phone VARCHAR(20) NULL,
        emergency_contact VARCHAR(255) NULL,
        gpa DECIMAL(3, 2) NULL,
        total_attendance_hours INT DEFAULT 0,
        total_classes_attended INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 8: VERIFIED_DEVICES (Student device tracking)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS verified_devices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        device_name VARCHAR(255) NOT NULL,
        device_id VARCHAR(256) UNIQUE NOT NULL,
        device_hash VARCHAR(256) NOT NULL,
        device_type VARCHAR(100) NULL,
        os VARCHAR(100) NULL,
        browser VARCHAR(100) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP NULL,
        last_login TIMESTAMP NULL,
        last_ip VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student (student_id),
        INDEX idx_device_id (device_id),
        INDEX idx_verified (verified),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 9: STUDENT_ATTENDANCE_ANALYTICS (Attendance summary)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_attendance_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        class_id INT NOT NULL,
        total_classes INT DEFAULT 0,
        present_count INT DEFAULT 0,
        absent_count INT DEFAULT 0,
        late_count INT DEFAULT 0,
        excused_count INT DEFAULT 0,
        attendance_percentage DECIMAL(5, 2) DEFAULT 0,
        last_attendance_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_class (student_id, class_id),
        INDEX idx_student (student_id),
        INDEX idx_class (class_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 10: STUDENT_GRADES (Academic grades)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_grades (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        class_id INT NOT NULL,
        assessment_type VARCHAR(100) NOT NULL,
        score DECIMAL(5, 2) NOT NULL,
        grade_letter VARCHAR(2) NULL,
        date_graded DATE NOT NULL,
        comments TEXT NULL,
        graded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student (student_id),
        INDEX idx_class (class_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ============================================================
    // TABLE 11: COURSE_RESOURCES (Learning materials)
    // ============================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS course_resources (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        category ENUM('lecture_notes', 'assignments', 'textbooks', 'videos', 'other') DEFAULT 'other',
        file_url VARCHAR(500) NULL,
        file_path VARCHAR(500) NULL,
        file_size INT NULL,
        uploaded_by INT NOT NULL,
        uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_class (class_id),
        INDEX idx_category (category),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ STEP 1 COMPLETE: Base schema created successfully!');
    console.log('✅ Tables created: users, classes, course_enrollments, class_sessions, attendance_logs, notifications, student_profiles, verified_devices, student_attendance_analytics, student_grades, course_resources');
    
    return true;
  } catch (error) {
    console.error('❌ STEP 1 FAILED:', error.message);
    throw error;
  }
}

module.exports = { initializeBaseSchema };
