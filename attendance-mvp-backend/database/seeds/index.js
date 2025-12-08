const pool = require('../../src/config/database');
const bcrypt = require('bcryptjs');

/**
 * Database Seeding Script
 * Populates database with sample data for testing
 * 
 * Seed Data:
 * - 3 Lecturers
 * - 20 Students
 * - 5 Classes
 * - Class Schedules
 * - Student Enrollments
 * - Sample Attendance Records
 */

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Hash passwords
    const lecturerPassword = await bcrypt.hash('password123', 10);
    const studentPassword = await bcrypt.hash('password123', 10);

    // 1. Insert Lecturers
    console.log('👨‍🏫 Creating lecturers...');
    const lecturers = [
      { email: 'prof.smith@university.edu', password_hash: lecturerPassword, first_name: 'John', last_name: 'Smith' },
      { email: 'prof.johnson@university.edu', password_hash: lecturerPassword, first_name: 'Sarah', last_name: 'Johnson' },
      { email: 'prof.williams@university.edu', password_hash: lecturerPassword, first_name: 'Michael', last_name: 'Williams' }
    ];

    const lecturerIds = [];
    for (const lecturer of lecturers) {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [lecturer.email, lecturer.password_hash, lecturer.first_name, lecturer.last_name, 'lecturer']
      );
      lecturerIds.push(result.rows[0].id);
      console.log(`  ✓ Created: ${lecturer.first_name} ${lecturer.last_name}`);
    }

    // 2. Insert Students
    console.log('\n👨‍🎓 Creating students...');
    const studentIds = [];
    for (let i = 1; i <= 20; i++) {
      const studentNumber = `STU${String(i).padStart(5, '0')}`;
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, student_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [
          `student${i}@university.edu`,
          studentPassword,
          `Student`,
          `Number${i}`,
          'student',
          studentNumber
        ]
      );
      studentIds.push(result.rows[0].id);
      if (i % 5 === 0) console.log(`  ✓ Created ${i} students`);
    }

    // 3. Insert Classes
    console.log('\n📚 Creating classes...');
    const courses = [
      { code: 'CS101', name: 'Introduction to Programming', unit: 'CMP', semester: '1' },
      { code: 'CS201', name: 'Data Structures', unit: 'CMP', semester: '2' },
      { code: 'MTH101', name: 'Calculus I', unit: 'MTH', semester: '1' },
      { code: 'PHY101', name: 'Physics I', unit: 'PHY', semester: '1' },
      { code: 'ENG101', name: 'English Literature', unit: 'ENG', semester: '1' }
    ];

    const classIds = [];
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const result = await pool.query(
        'INSERT INTO classes (course_code, course_name, lecturer_id, unit_code, semester) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [course.code, course.name, lecturerIds[i % lecturerIds.length], course.unit, course.semester]
      );
      classIds.push(result.rows[0].id);
      console.log(`  ✓ Created: ${course.code} - ${course.name}`);
    }

    // 4. Add Class Schedules
    console.log('\n📅 Creating schedules...');
    const schedules = [
      { day: 'Monday', start: '09:00', end: '11:00', room: 'A101' },
      { day: 'Wednesday', start: '09:00', end: '11:00', room: 'A101' },
      { day: 'Tuesday', start: '14:00', end: '16:00', room: 'B202' },
      { day: 'Thursday', start: '14:00', end: '16:00', room: 'B202' }
    ];

    for (const classId of classIds) {
      for (const schedule of schedules) {
        await pool.query(
          'INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room_number) VALUES ($1, $2, $3, $4, $5)',
          [classId, schedule.day, schedule.start, schedule.end, schedule.room]
        );
      }
    }
    console.log(`  ✓ Created schedules for ${classIds.length} classes`);

    // 5. Enroll Students in Classes
    console.log('\n📋 Enrolling students...');
    for (const classId of classIds) {
      for (let i = 0; i < 15; i++) {
        const studentId = studentIds[i];
        await pool.query(
          'INSERT INTO student_enrollments (student_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [studentId, classId]
        );
      }
    }
    console.log(`  ✓ Enrolled students in classes`);

    // 6. Insert Sample Attendance Records
    console.log('\n✅ Creating attendance records...');
    const statuses = ['present', 'absent', 'late', 'excused'];
    let attendanceCount = 0;

    for (const classId of classIds) {
      for (let i = 0; i < 15; i++) {
        const studentId = studentIds[i];
        
        // Create attendance for last 10 days
        for (let day = 0; day < 10; day++) {
          const date = new Date();
          date.setDate(date.getDate() - day);
          const dateStr = date.toISOString().split('T')[0];
          
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await pool.query(
            'INSERT INTO attendance (student_id, class_id, attendance_date, status, marked_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [studentId, classId, dateStr, status, lecturerIds[0]]
          );
          attendanceCount++;
        }
      }
    }
    console.log(`  ✓ Created ${attendanceCount} attendance records`);

    // 7. Insert Sample Notifications
    console.log('\n🔔 Creating sample notifications...');
    for (const studentId of studentIds.slice(0, 5)) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [studentId, 'Welcome to Attendance System', 'You have been enrolled in your classes', 'info']
      );
    }
    console.log(`  ✓ Created sample notifications`);

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('Sample Login Credentials:');
    console.log('  Lecturer: prof.smith@university.edu / password123');
    console.log('  Student:  student1@university.edu / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
