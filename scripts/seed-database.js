const db = require('../backend/database');
// const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
  let connection;

  try {
    // Get connection from pool
    connection = await db.getConnection();

    console.log('Connected to database');

    // Clear existing data (in reverse dependency order)
    console.log('Clearing existing data...');
    const clearQueries = [
      'DELETE FROM attendance_logs',
      'DELETE FROM class_sessions',
      'DELETE FROM calendar_events',
      'DELETE FROM course_analytics',
      'DELETE FROM student_attendance_analytics',
      'DELETE FROM attendance_streaks',
      'DELETE FROM student_badges',
      'DELETE FROM badges',
      'DELETE FROM ai_predictions',
      'DELETE FROM admin_messages',
      'DELETE FROM support_responses',
      'DELETE FROM support_tickets',
      'DELETE FROM notifications',
      'DELETE FROM verified_devices',
      'DELETE FROM user_settings',
      'DELETE FROM active_sessions',
      'DELETE FROM student_profiles',
      'DELETE FROM classes',
      'DELETE FROM users'
    ];

    for (const query of clearQueries) {
      try {
        await connection.execute(query);
      } catch (error) {
        // Ignore errors for tables that don't exist
        if (!error.message.includes("doesn't exist")) {
          throw error;
        }
      }
    }

    console.log('Existing data cleared');

    // Hash password for all users
    const bcrypt = require('../backend/node_modules/bcryptjs');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);

    // Insert sample users
    console.log('Inserting users...');
    const users = [
      // Admins
      ['Admin User', 'admin@university.edu', hashedPassword, 'admin', null, 'ADM001', 'Administration'],
      // Lecturers
      ['Dr. John Smith', 'john.smith@university.edu', hashedPassword, 'lecturer', null, 'LEC001', 'Computer Science'],
      ['Prof. Sarah Johnson', 'sarah.johnson@university.edu', hashedPassword, 'lecturer', null, 'LEC002', 'Mathematics'],
      ['Dr. Michael Brown', 'michael.brown@university.edu', hashedPassword, 'lecturer', null, 'LEC003', 'Physics'],
      // Students
      ['Alice Johnson', 'alice.johnson@student.university.edu', hashedPassword, 'student', 'STU001', null, 'Computer Science'],
      ['Bob Wilson', 'bob.wilson@student.university.edu', hashedPassword, 'student', 'STU002', null, 'Computer Science'],
      ['Charlie Davis', 'charlie.davis@student.university.edu', hashedPassword, 'student', 'STU003', null, 'Mathematics'],
      ['Diana Miller', 'diana.miller@student.university.edu', hashedPassword, 'student', 'STU004', null, 'Mathematics'],
      ['Eve Garcia', 'eve.garcia@student.university.edu', hashedPassword, 'student', 'STU005', null, 'Physics'],
      ['Frank Thompson', 'frank.thompson@student.university.edu', hashedPassword, 'student', 'STU006', null, 'Physics'],
      ['Grace Lee', 'grace.lee@student.university.edu', hashedPassword, 'student', 'STU007', null, 'Computer Science'],
      ['Henry White', 'henry.white@student.university.edu', hashedPassword, 'student', 'STU008', null, 'Mathematics']
    ];

    for (const user of users) {
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role, student_id, employee_id, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        user
      );
    }

    // Get user IDs
    const [userRows] = await connection.execute('SELECT id, role, name FROM users');
    const admins = userRows.filter(u => u.role === 'admin');
    const lecturers = userRows.filter(u => u.role === 'lecturer');
    const students = userRows.filter(u => u.role === 'student');

    // Insert classes
    console.log('Inserting classes...');
    const classes = [
      ['CS101', 'Introduction to Programming', lecturers[0].id, 'Monday', '09:00:00', '10:30:00', 40.7128, -74.0060],
      ['CS201', 'Data Structures', lecturers[0].id, 'Wednesday', '11:00:00', '12:30:00', 40.7128, -74.0060],
      ['MATH101', 'Calculus I', lecturers[1].id, 'Tuesday', '09:00:00', '10:30:00', 40.7589, -73.9851],
      ['MATH201', 'Linear Algebra', lecturers[1].id, 'Thursday', '11:00:00', '12:30:00', 40.7589, -73.9851],
      ['PHYS101', 'Physics I', lecturers[2].id, 'Monday', '14:00:00', '15:30:00', 40.7505, -73.9934],
      ['PHYS201', 'Modern Physics', lecturers[2].id, 'Wednesday', '14:00:00', '15:30:00', 40.7505, -73.9934]
    ];

    for (const cls of classes) {
      await connection.execute(
        'INSERT INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        cls
      );
    }

    // Get class IDs
    const [classRows] = await connection.execute('SELECT id, course_code FROM classes');

    // Insert class sessions for the current week
    console.log('Inserting class sessions...');
    const today = new Date();
    const currentWeek = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i + 1); // Start from Monday
      currentWeek.push(date.toISOString().split('T')[0]);
    }

    for (const cls of classRows) {
      const classInfo = classes.find(c => c[0] === cls.course_code);
      if (classInfo) {
        const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(classInfo[3]);
        if (dayIndex >= 0) {
          const sessionDate = currentWeek[dayIndex];
          if (sessionDate) {
            await connection.execute(
              'INSERT INTO class_sessions (class_id, session_date, qr_signature_hash, qr_expires_at, is_active) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR), ?)',
              [cls.id, sessionDate, `qr_${cls.id}_${sessionDate}`, true]
            );
          }
        }
      }
    }

    // Get session IDs
    const [sessionRows] = await connection.execute('SELECT id, class_id, session_date FROM class_sessions');

    // Insert attendance logs
    console.log('Inserting attendance logs...');
    for (const session of sessionRows) {
      const classInfo = classRows.find(c => c.id === session.class_id);
      const enrolledStudents = students.filter(s => {
        // Simple logic: assign students to classes based on their department
        if (classInfo.course_code.startsWith('CS') && s.name.includes('lice') || s.name.includes('Bob') || s.name.includes('Grace')) return true;
        if (classInfo.course_code.startsWith('MATH') && s.name.includes('Charlie') || s.name.includes('Diana') || s.name.includes('Henry')) return true;
        if (classInfo.course_code.startsWith('PHYS') && s.name.includes('Eve') || s.name.includes('Frank')) return true;
        return false;
      });

      for (const student of enrolledStudents) {
        const isPresent = Math.random() > 0.2; // 80% attendance rate
        if (isPresent) {
          const checkinTime = new Date(session.session_date + 'T' + '09:15:00'); // 15 minutes after class start
          await connection.execute(
            'INSERT INTO attendance_logs (session_id, student_id, checkin_time, verification_status) VALUES (?, ?, ?, ?)',
            [session.id, student.id, checkinTime.toISOString().slice(0, 19).replace('T', ' '), 'success']
          );
        }
      }
    }

    // Insert student profiles
    console.log('Inserting student profiles...');
    for (const student of students) {
      await connection.execute(
        'INSERT INTO student_profiles (student_id, bio, phone, risk_level) VALUES (?, ?, ?, ?)',
        [student.id, `Student in ${student.department} department`, '+1234567890', Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'medium' : 'low']
      );
    }

    // Insert notifications
    console.log('Inserting notifications...');
    const notifications = [
      [students[0].id, 'class_alert', 'Class Reminder', 'Your CS101 class starts in 30 minutes'],
      [students[1].id, 'attendance_warning', 'Attendance Alert', 'You have missed 2 classes this week'],
      [students[2].id, 'message', 'New Message', 'You have a new message from your lecturer'],
      [lecturers[0].id, 'system', 'System Update', 'New attendance analytics available'],
      [admins[0].id, 'admin_alert', 'Admin Alert', 'System maintenance scheduled for tonight']
    ];

    for (const notification of notifications) {
      await connection.execute(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        notification
      );
    }

    // Insert badges
    console.log('Inserting badges...');
    const badges = [
      ['Perfect Attendance', 'Attend all classes in a month', 'attendance_streak', 30],
      ['Early Bird', 'Arrive early to 10 classes', 'punctuality_score', 10],
      ['Consistent Learner', 'Maintain 90% attendance for a semester', 'attendance_percentage', 90]
    ];

    for (const badge of badges) {
      await connection.execute(
        'INSERT INTO badges (name, description, requirement_type, requirement_value) VALUES (?, ?, ?, ?)',
        badge
      );
    }

    // Insert calendar events
    console.log('Inserting calendar events...');
    const calendarEvents = [
      ['CS101 Lecture', 'class', classRows[0].id, currentWeek[1], currentWeek[1], '09:00:00', '10:30:00', 'Room 101', 'Regular class session', lecturers[0].id],
      ['MATH101 Lecture', 'class', classRows[2].id, currentWeek[2], currentWeek[2], '09:00:00', '10:30:00', 'Room 201', 'Regular class session', lecturers[1].id],
      ['Final Exam Period', 'exam', null, '2025-12-20', '2025-12-20', '09:00:00', '12:00:00', 'Main Hall', 'Final examinations', admins[0].id]
    ];

    for (const event of calendarEvents) {
      await connection.execute(
        'INSERT INTO calendar_events (title, event_type, class_id, start_date, end_date, start_time, end_time, location, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        event
      );
    }

    // Insert AI predictions
    console.log('Inserting AI predictions...');
    for (const student of students) {
      const predictionTypes = ['absenteeism_risk', 'punctuality_score', 'anomaly_detection'];
      for (const type of predictionTypes) {
        const predictionValue = type === 'absenteeism_risk' ?
          JSON.stringify({ risk_level: Math.random() > 0.7 ? 'high' : 'low', probability: Math.random() }) :
          type === 'punctuality_score' ?
          JSON.stringify({ score: Math.floor(Math.random() * 100), trend: 'improving' }) :
          JSON.stringify({ anomalies_detected: Math.floor(Math.random() * 3), last_check: new Date().toISOString() });

        await connection.execute(
          'INSERT INTO ai_predictions (student_id, prediction_type, prediction_value, prediction_date) VALUES (?, ?, ?, ?)',
          [student.id, type, predictionValue, new Date().toISOString().split('T')[0]]
        );
      }
    }

    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) {
      await connection.release();
      console.log('Database connection closed');
    }
  }
}

// Run the seeding function
seedDatabase();