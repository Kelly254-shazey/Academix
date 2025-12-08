const pool = require('../config/database');

/**
 * Analytics Service
 * Generates attendance reports and analytics
 */

class AnalyticsService {
  /**
   * Get student's attendance report for a class
   */
  static async getStudentReport(studentId, classId) {
    const query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.student_id as student_number,
        c.course_code, c.course_name,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as sessions_attended,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as sessions_missed,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_arrivals,
        ROUND(
          (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::FLOAT / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as attendance_percentage
      FROM users u
      JOIN attendance a ON u.id = a.student_id
      JOIN classes c ON a.class_id = c.id
      WHERE u.id = $1 AND c.id = $2
      GROUP BY u.id, c.id
    `;

    const result = await pool.query(query, [studentId, classId]);
    return result.rows[0];
  }

  /**
   * Get all students' attendance in a class
   */
  static async getClassAttendanceReport(classId) {
    const query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.student_id as student_number,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as sessions_attended,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as sessions_missed,
        ROUND(
          (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::FLOAT / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as attendance_percentage
      FROM users u
      LEFT JOIN attendance a ON u.id = a.student_id AND a.class_id = $1
      LEFT JOIN student_enrollments se ON u.id = se.student_id AND se.class_id = $1
      WHERE se.student_id IS NOT NULL
      GROUP BY u.id
      ORDER BY u.first_name ASC
    `;

    const result = await pool.query(query, [classId]);
    return result.rows;
  }

  /**
   * Get weekly attendance trends
   */
  static async getWeeklyTrends(classId, weeks = 4) {
    const query = `
      SELECT 
        DATE_TRUNC('week', a.attendance_date) as week_start,
        COUNT(*) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        ROUND(
          (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::FLOAT / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as weekly_attendance_rate
      FROM attendance a
      WHERE a.class_id = $1 
        AND a.attendance_date >= CURRENT_DATE - INTERVAL '${weeks} weeks'
      GROUP BY DATE_TRUNC('week', a.attendance_date)
      ORDER BY week_start DESC
    `;

    const result = await pool.query(query, [classId]);
    return result.rows;
  }

  /**
   * Get lecturer's dashboard overview
   */
  static async getLecturerOverview(lecturerId) {
    const query = `
      SELECT 
        COUNT(DISTINCT c.id) as total_classes,
        COUNT(DISTINCT se.student_id) as total_students,
        COUNT(a.id) as total_attendance_records,
        ROUND(
          (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::FLOAT / 
           NULLIF(COUNT(a.id), 0)) * 100, 2
        ) as overall_attendance_rate
      FROM classes c
      LEFT JOIN student_enrollments se ON c.id = se.class_id
      LEFT JOIN attendance a ON c.id = a.class_id
      WHERE c.lecturer_id = $1
    `;

    const result = await pool.query(query, [lecturerId]);
    return result.rows[0];
  }

  /**
   * Get admin platform overview
   */
  static async getPlatformOverview() {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
        (SELECT COUNT(*) FROM classes) as total_classes,
        (SELECT COUNT(*) FROM attendance) as total_attendance_records,
        ROUND(
          (SELECT COUNT(*) FILTER (WHERE status = 'present') FROM attendance)::FLOAT / 
          NULLIF((SELECT COUNT(*) FROM attendance), 0) * 100, 2
        ) as overall_attendance_rate
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = AnalyticsService;
