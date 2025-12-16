/**
 * Compatibility Migration
 * Adds columns and tables/views expected by older code paths:
 * - adds `full_name` to `users`
 * - creates `departments` table
 * - creates `lecturer_profiles` table
 * - creates `sessions` view (alias for class_sessions)
 * - creates `class_enrollments` view (alias for course_enrollments)
 */

async function up(db) {
  try {
    console.log('🟢 STEP 6: Applying compatibility schema changes...');

    // 1. Add full_name column to users if missing
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL`)
      .catch(() => { /* ignore if not supported by older MySQL */ });

    // If full_name exists but is NULL, set it from name
    await db.execute(`UPDATE users SET full_name = name WHERE (full_name IS NULL OR full_name = '')`)
      .catch(() => { /* ignore safely */ });

    // 2. Departments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. Lecturer profiles table (compatible shape used in services)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lecturer_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lecturer_id INT NOT NULL,
        bio TEXT NULL,
        phone VARCHAR(50) NULL,
        avatar VARCHAR(500) NULL,
        department_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lecturer (lecturer_id),
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 4. Create sessions view as alias for class_sessions so older queries work
    await db.execute(`DROP VIEW IF EXISTS sessions`).catch(() => {});
    await db.execute(`
      CREATE VIEW sessions AS
      SELECT
        id,
        class_id,
        lecturer_id,
        start_time,
        end_time,
        date,
        day_of_week,
        topic,
        description,
        location,
        classroom,
        latitude,
        longitude,
        qr_code,
        qr_expiry,
        status,
        attendance_status,
        total_students_expected,
        attendance_marked,
        created_at,
        updated_at
      FROM class_sessions
    `).catch(() => { console.log('Could not create sessions view (db may not support views)'); });

    // 5. Create class_enrollments view as alias for course_enrollments
    await db.execute(`DROP VIEW IF EXISTS class_enrollments`).catch(() => {});
    await db.execute(`
      CREATE VIEW class_enrollments AS
      SELECT id, class_id, student_id, enrollment_date, completion_status, grade
      FROM course_enrollments
    `).catch(() => { console.log('Could not create class_enrollments view'); });

    console.log('✅ STEP 6 COMPLETE: Compatibility schema applied');
    return true;
  } catch (err) {
    console.error('❌ STEP 6 FAILED:', err.message || err);
    throw err;
  }
}

module.exports = { up };
