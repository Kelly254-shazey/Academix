const pool = require('../config/database');

/**
 * Class Service
 * Manages course/class information and schedules
 */

class ClassService {
  /**
   * Create a new class
   */
  static async createClass(courseCode, courseName, lecturerId, unitCode = null, semester = null) {
    const query = `
      INSERT INTO classes (course_code, course_name, lecturer_id, unit_code, semester)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, course_code, course_name, lecturer_id, unit_code, semester, created_at
    `;
    const result = await pool.query(query, [courseCode, courseName, lecturerId, unitCode, semester]);
    return result.rows[0];
  }

  /**
   * Get all classes with lecturer info
   */
  static async getAllClasses(limit = 50, offset = 0) {
    const query = `
      SELECT c.id, c.course_code, c.course_name, c.unit_code, c.semester,
             u.id as lecturer_id, u.first_name as lecturer_first_name, 
             u.last_name as lecturer_last_name, c.created_at
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get classes by lecturer
   */
  static async getClassesByLecturer(lecturerId) {
    const query = `
      SELECT id, course_code, course_name, unit_code, semester, lecturer_id, created_at
      FROM classes
      WHERE lecturer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [lecturerId]);
    return result.rows;
  }

  /**
   * Get class by ID with schedule info
   */
  static async getClassById(classId) {
    const query = `
      SELECT c.id, c.course_code, c.course_name, c.unit_code, c.semester,
             c.lecturer_id, u.first_name, u.last_name,
             json_agg(json_build_object(
               'id', cs.id, 'day_of_week', cs.day_of_week,
               'start_time', cs.start_time, 'end_time', cs.end_time,
               'room_number', cs.room_number
             )) as schedules
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN class_schedules cs ON c.id = cs.class_id
      WHERE c.id = $1
      GROUP BY c.id, u.id
    `;
    const result = await pool.query(query, [classId]);
    return result.rows[0];
  }

  /**
   * Add class schedule
   */
  static async addSchedule(classId, dayOfWeek, startTime, endTime, roomNumber = null) {
    const query = `
      INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, class_id, day_of_week, start_time, end_time, room_number
    `;
    const result = await pool.query(query, [classId, dayOfWeek, startTime, endTime, roomNumber]);
    return result.rows[0];
  }

  /**
   * Enroll student in class
   */
  static async enrollStudent(studentId, classId) {
    const query = `
      INSERT INTO student_enrollments (student_id, class_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING id, student_id, class_id, enrolled_at
    `;
    const result = await pool.query(query, [studentId, classId]);
    return result.rows[0];
  }

  /**
   * Get student's enrolled classes
   */
  static async getStudentClasses(studentId) {
    const query = `
      SELECT c.id, c.course_code, c.course_name, c.unit_code, c.semester,
             u.id as lecturer_id, u.first_name as lecturer_first_name,
             u.last_name as lecturer_last_name
      FROM classes c
      JOIN student_enrollments se ON c.id = se.class_id
      JOIN users u ON c.lecturer_id = u.id
      WHERE se.student_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [studentId]);
    return result.rows;
  }
}

module.exports = ClassService;
