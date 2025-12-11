const db = require('../database');
const logger = require('../utils/logger');

const courseAnalyticsService = {
  // Get course analytics
  async getCourseAnalytics(courseId) {
    try {
      const [courseData] = await db.execute(
        `SELECT 
          c.id,
          c.course_code,
          c.course_name,
          c.lecturer_id,
          u.name as lecturer_name,
          COUNT(DISTINCT cs.id) as total_sessions,
          COUNT(DISTINCT al.student_id) as total_students,
          ROUND(AVG(
            COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / 
            COUNT(DISTINCT cs.id)
          ), 2) as average_attendance_percent
        FROM classes c
        LEFT JOIN users u ON c.lecturer_id = u.id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        LEFT JOIN attendance_logs al ON cs.id = al.session_id
        WHERE c.id = ?
        GROUP BY c.id, c.course_code, c.course_name, c.lecturer_id, u.name`,
        [courseId]
      );

      if (!courseData.length) {
        throw new Error('Course not found');
      }

      const course = courseData[0];

      // Get student attendance breakdown
      const [studentBreakdown] = await db.execute(
        `SELECT 
          u.id,
          u.name,
          u.student_id,
          COUNT(DISTINCT cs.id) as sessions_available,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended,
          COUNT(CASE WHEN al.verification_status = 'late' THEN 1 END) as lates,
          COUNT(CASE WHEN al.verification_status = 'absent' THEN 1 END) as absences,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id), 2) as attendance_percent
        FROM users u
        CROSS JOIN (SELECT DISTINCT class_id FROM class_sessions WHERE class_id = ?) cs_count
        LEFT JOIN class_sessions cs ON cs.class_id = ? AND cs.session_date < CURDATE()
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
        WHERE u.role = 'student'
        GROUP BY u.id, u.name, u.student_id
        ORDER BY attendance_percent DESC`,
        [courseId, courseId]
      );

      return {
        course: {
          id: course.id,
          code: course.course_code,
          name: course.course_name,
          lecturerName: course.lecturer_name,
          totalSessions: course.total_sessions,
          totalStudents: course.total_students,
          averageAttendance: course.average_attendance_percent || 0,
        },
        studentBreakdown: studentBreakdown.map(s => ({
          studentId: s.id,
          studentName: s.name,
          studentNumber: s.student_id,
          sessionsAvailable: s.sessions_available || 0,
          attended: s.attended || 0,
          lates: s.lates || 0,
          absences: s.absences || 0,
          attendancePercent: s.attendance_percent || 0,
        })),
      };
    } catch (error) {
      logger.error('Error fetching course analytics:', error);
      throw error;
    }
  },

  // Get attendance trends
  async getAttendanceTrends(courseId, daysBack = 30) {
    try {
      const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];

      const [trends] = await db.execute(
        `SELECT 
          DATE(al.checkin_time) as date,
          COUNT(DISTINCT al.student_id) as students_present,
          COUNT(DISTINCT cs.id) as classes_held,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as total_attendances,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(*), 2) as attendance_percent
        FROM class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id
        WHERE cs.class_id = ? AND DATE(al.checkin_time) >= ?
        GROUP BY DATE(al.checkin_time)
        ORDER BY date ASC`,
        [courseId, startDate]
      );

      return trends.map(t => ({
        date: t.date,
        studentsPresent: t.students_present || 0,
        classesHeld: t.classes_held || 0,
        totalAttendances: t.total_attendances || 0,
        attendancePercent: t.attendance_percent || 0,
      }));
    } catch (error) {
      logger.error('Error fetching attendance trends:', error);
      throw error;
    }
  },

  // Get missed classes breakdown
  async getMissedClassesBreakdown(courseId) {
    try {
      const [missedClasses] = await db.execute(
        `SELECT 
          u.id as student_id,
          u.name as student_name,
          u.student_id,
          COUNT(CASE WHEN al.verification_status = 'absent' OR al.id IS NULL THEN 1 END) as missed_count,
          GROUP_CONCAT(cs.session_date ORDER BY cs.session_date DESC SEPARATOR ', ') as missed_dates
        FROM users u
        CROSS JOIN class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
        WHERE cs.class_id = ? AND u.role = 'student' AND (al.id IS NULL OR al.verification_status = 'absent')
        GROUP BY u.id, u.name, u.student_id
        HAVING missed_count > 0
        ORDER BY missed_count DESC`,
        [courseId]
      );

      return missedClasses.map(m => ({
        studentId: m.student_id,
        studentName: m.student_name,
        studentNumber: m.student_id,
        missedCount: m.missed_count,
        missedDates: m.missed_dates ? m.missed_dates.split(', ') : [],
      }));
    } catch (error) {
      logger.error('Error fetching missed classes breakdown:', error);
      throw error;
    }
  },

  // Get absentee risk assessment
  async getAbsenteeRiskAssessment(courseId, riskThreshold = 75) {
    try {
      const [riskAssessment] = await db.execute(
        `SELECT 
          u.id as student_id,
          u.name,
          u.student_id,
          COUNT(DISTINCT cs.id) as total_sessions,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id), 2) as attendance_percent,
          CASE 
            WHEN COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < 50 THEN 'critical'
            WHEN COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < 75 THEN 'high'
            ELSE 'medium'
          END as risk_level
        FROM users u
        CROSS JOIN class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
        WHERE cs.class_id = ? AND u.role = 'student'
        GROUP BY u.id, u.name, u.student_id
        HAVING COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < ?
        ORDER BY attendance_percent ASC`,
        [courseId, riskThreshold]
      );

      return riskAssessment.map(r => ({
        studentId: r.student_id,
        studentName: r.name,
        studentNumber: r.student_id,
        totalSessions: r.total_sessions,
        attended: r.attended,
        attendancePercent: r.attendance_percent,
        riskLevel: r.risk_level,
        interventionRequired: true,
      }));
    } catch (error) {
      logger.error('Error getting absentee risk assessment:', error);
      throw error;
    }
  },

  // Update course analytics summary
  async updateCourseAnalyticsSummary(courseId) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(DISTINCT cs.id) as total_sessions,
          ROUND(AVG(
            COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / 
            COUNT(DISTINCT cs.id)
          ), 2) as average_attendance,
          COUNT(DISTINCT CASE WHEN al.id IS NOT NULL THEN al.student_id END) as total_students
        FROM class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id
        WHERE cs.class_id = ?`,
        [courseId]
      );

      const stat = stats[0];

      const [existing] = await db.execute(
        `SELECT id FROM course_analytics WHERE class_id = ?`,
        [courseId]
      );

      if (existing.length > 0) {
        await db.execute(
          `UPDATE course_analytics 
           SET total_sessions = ?, average_attendance_percent = ?, total_students_enrolled = ?
           WHERE class_id = ?`,
          [stat.total_sessions || 0, stat.average_attendance || 0, stat.total_students || 0, courseId]
        );
      } else {
        await db.execute(
          `INSERT INTO course_analytics (class_id, total_sessions, average_attendance_percent, total_students_enrolled)
           VALUES (?, ?, ?, ?)`,
          [courseId, stat.total_sessions || 0, stat.average_attendance || 0, stat.total_students || 0]
        );
      }

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error updating course analytics:', error);
      throw error;
    }
  },
};

module.exports = courseAnalyticsService;
