const pool = require('../config/database');

/**
 * Attendance Service
 * Handles marking and retrieving attendance records
 */

class AttendanceService {
  /**
   * Mark attendance for a student
   */
  static async markAttendance(studentId, classId, status, markedBy, notes = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      INSERT INTO attendance (student_id, class_id, attendance_date, status, marked_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, class_id, attendance_date) 
      DO UPDATE SET status = $4, marked_by = $5, notes = $6, marked_at = CURRENT_TIMESTAMP
      RETURNING id, student_id, class_id, attendance_date, status, marked_at
    `;

    const result = await pool.query(query, [studentId, classId, today, status, markedBy, notes]);
    return result.rows[0];
  }

  /**
   * Get attendance records for a class
   */
  static async getClassAttendance(classId, startDate = null, endDate = null) {
    let query = `
      SELECT a.id, a.student_id, a.class_id, a.attendance_date, a.status,
             u.first_name, u.last_name, u.student_id as student_number,
             a.marked_at, a.notes
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.class_id = $1
    `;

    const params = [classId];

    if (startDate) {
      params.push(startDate);
      query += ` AND a.attendance_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND a.attendance_date <= $${params.length}`;
    }

    query += ' ORDER BY a.attendance_date DESC, u.first_name ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get attendance records for a student
   */
  static async getStudentAttendance(studentId, classId = null) {
    let query = `
      SELECT a.id, a.student_id, a.class_id, a.attendance_date, a.status,
             c.course_code, c.course_name, a.marked_at, a.notes
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE a.student_id = $1
    `;

    const params = [studentId];

    if (classId) {
      params.push(classId);
      query += ` AND a.class_id = $${params.length}`;
    }

    query += ' ORDER BY a.attendance_date DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Calculate attendance statistics for a student in a class
   */
  static async getAttendanceStats(studentId, classId) {
    const query = `
      SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        ROUND(
          (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::FLOAT / COUNT(*)) * 100, 2
        ) as attendance_percentage
      FROM attendance
      WHERE student_id = $1 AND class_id = $2
    `;

    const result = await pool.query(query, [studentId, classId]);
    return result.rows[0];
  }

  /**
   * Get class-wide attendance statistics
   */
  static async getClassStats(classId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(DISTINCT student_id) as total_students,
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as total_late,
        ROUND(
          (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::FLOAT / COUNT(*)) * 100, 2
        ) as class_attendance_rate
      FROM attendance
      WHERE class_id = $1
    `;

    const params = [classId];

    if (startDate) {
      params.push(startDate);
      query += ` AND attendance_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND attendance_date <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = AttendanceService;
