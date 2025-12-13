const db = require('../backend/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('Seeding database with sample data...');

    // Insert sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.execute(
      `INSERT IGNORE INTO users (name, email, password_hash, role, student_id, department) VALUES
      ('John Student', 'student@example.com', ?, 'student', 'STU001', 'Computer Science'),
      ('Jane Lecturer', 'lecturer@example.com', ?, 'lecturer', NULL, 'Computer Science'),
      ('Admin User', 'admin@example.com', ?, 'admin', NULL, 'IT')`,
      [hashedPassword, hashedPassword, hashedPassword]
    );
    console.log('Users inserted');

    // Insert sample classes
    await db.execute(
      `INSERT IGNORE INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng) VALUES
      ('CS101', 'Introduction to Programming', 2, 'Monday', '09:00:00', '10:30:00', 40.7128, -74.0060),
      ('CS102', 'Data Structures', 2, 'Tuesday', '11:00:00', '12:30:00', 40.7128, -74.0060),
      ('CS103', 'Algorithms', 2, 'Wednesday', '14:00:00', '15:30:00', 40.7128, -74.0060)`
    );
    console.log('Classes inserted');

    // Insert class sessions for today
    const today = new Date().toISOString().split('T')[0];
    await db.execute(
      `INSERT IGNORE INTO class_sessions (class_id, session_date, qr_signature_hash, qr_expires_at, is_active) VALUES
      (1, ?, 'hash1', DATE_ADD(NOW(), INTERVAL 1 HOUR), 1),
      (2, ?, 'hash2', DATE_ADD(NOW(), INTERVAL 1 HOUR), 1),
      (3, ?, 'hash3', DATE_ADD(NOW(), INTERVAL 1 HOUR), 1)`,
      [today, today, today]
    );
    console.log('Sessions inserted');

    // Insert attendance logs
    await db.execute(
      `INSERT IGNORE INTO attendance_logs (session_id, student_id, verification_status, timestamp, latitude, longitude) VALUES
      (1, 1, 'success', NOW(), 40.7128, -74.0060),
      (2, 1, 'success', NOW(), 40.7128, -74.0060),
      (3, 1, 'late', NOW(), 40.7128, -74.0060)`
    );
    console.log('Attendance inserted');

    // Insert notifications
    await db.execute(
      `INSERT IGNORE INTO notifications (user_id, title, message, type, is_read) VALUES
      (1, 'Welcome', 'Welcome to the ClassTrack system!', 'info', 0),
      (1, 'Class Reminder', 'Your CS101 class starts in 30 minutes', 'reminder', 0),
      (1, 'Attendance Marked', 'Your attendance for CS102 has been marked', 'success', 1)`
    );
    console.log('Notifications inserted');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();