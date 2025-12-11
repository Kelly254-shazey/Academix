const db = require('../database');
const logger = require('../utils/logger');

const attendanceService = {
  // Get overall attendance percentage for a student
  async getOverallAttendance(studentId) {
    try {
      const [result] = await db.execute(
        `SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(CASE WHEN verification_status IN ('success', 'late') THEN 1 END) as attended,
          ROUND(COUNT(CASE WHEN verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT session_id), 2) as percentage
        FROM attendance_logs
        WHERE student_id = ?`,
        [studentId]
      );
      
      return {
        totalSessions: result[0].total_sessions || 0,
        attended: result[0].attended || 0,
        percentage: result[0].percentage || 0,
      };
    } catch (error) {
      logger.error('Error calculating overall attendance:', error);
      throw error;
    }
  },

  // Get attendance per course
  async getAttendancePerCourse(studentId) {
    try {
      const [results] = await db.execute(
        `SELECT 
          c.id,
          c.course_code,
          c.course_name,
          COUNT(DISTINCT al.session_id) as total_sessions,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT al.session_id), 2) as attendance_percent,
          COUNT(CASE WHEN al.verification_status = 'absent' THEN 1 END) as absences,
          COUNT(CASE WHEN al.verification_status = 'late' THEN 1 END) as lates
        FROM classes c
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        GROUP BY c.id, c.course_code, c.course_name
        ORDER BY c.course_name ASC`,
        [studentId]
      );
      
      return results.map(row => ({
        courseId: row.id,
        courseCode: row.course_code,
        courseName: row.course_name,
        totalSessions: row.total_sessions || 0,
        attended: row.attended || 0,
        attendancePercent: row.attendance_percent || 0,
        absences: row.absences || 0,
        lates: row.lates || 0,
      }));
    } catch (error) {
      logger.error('Error fetching attendance per course:', error);
      throw error;
    }
  },

  // Get attendance analytics with trends
  async getAttendanceAnalytics(studentId, startDate, endDate) {
    try {
      const [records] = await db.execute(
        `SELECT 
          DATE(al.checkin_time) as date,
          al.verification_status,
          c.course_name,
          COUNT(*) as count
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        WHERE al.student_id = ? AND DATE(al.checkin_time) BETWEEN ? AND ?
        GROUP BY DATE(al.checkin_time), al.verification_status, c.course_name
        ORDER BY date DESC`,
        [studentId, startDate, endDate]
      );

      // Group by date
      const analyticsMap = new Map();
      records.forEach(record => {
        const dateKey = record.date;
        if (!analyticsMap.has(dateKey)) {
          analyticsMap.set(dateKey, {
            date: record.date,
            present: 0,
            late: 0,
            absent: 0,
            other: 0,
            courses: [],
          });
        }
        
        const dayData = analyticsMap.get(dateKey);
        if (record.verification_status === 'success') dayData.present++;
        else if (record.verification_status === 'late') dayData.late++;
        else if (record.verification_status === 'absent') dayData.absent++;
        else dayData.other++;
        
        dayData.courses.push(record.course_name);
      });

      return Array.from(analyticsMap.values());
    } catch (error) {
      logger.error('Error fetching attendance analytics:', error);
      throw error;
    }
  },

  // Calculate low attendance threshold (default 75%)
  async checkLowAttendanceThreshold(studentId, threshold = 75) {
    try {
      const attendance = await this.getOverallAttendance(studentId);
      const isAtRisk = attendance.percentage < threshold;
      
      // Update student_attendance_analytics if needed
      if (isAtRisk) {
        await db.execute(
          `UPDATE student_attendance_analytics 
           SET is_at_risk = TRUE 
           WHERE student_id = ? AND attendance_percent < ?`,
          [studentId, threshold]
        );
      }

      return {
        isAtRisk,
        currentAttendance: attendance.percentage,
        threshold,
        riskGap: Math.max(0, threshold - attendance.percentage),
      };
    } catch (error) {
      logger.error('Error checking low attendance threshold:', error);
      throw error;
    }
  },

  // Get missed classes
  async getMissedClasses(studentId, limit = 10) {
    try {
      const [results] = await db.execute(
        `SELECT 
          cs.id as session_id,
          c.id as class_id,
          c.course_code,
          c.course_name,
          cs.session_date,
          c.start_time,
          c.end_time,
          al.verification_status,
          al.checkin_time
        FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        WHERE (al.verification_status = 'absent' OR al.id IS NULL)
        AND cs.session_date < CURDATE()
        ORDER BY cs.session_date DESC
        LIMIT ?`,
        [studentId, limit]
      );

      return results.map(row => ({
        sessionId: row.session_id,
        classId: row.class_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        date: row.session_date,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.verification_status || 'not_marked',
      }));
    } catch (error) {
      logger.error('Error fetching missed classes:', error);
      throw error;
    }
  },

  // Get absentee risk for a student
  async getAbsenteeRisk(studentId) {
    try {
      const [results] = await db.execute(
        `SELECT 
          c.id,
          c.course_code,
          c.course_name,
          COUNT(DISTINCT cs.id) as total_sessions,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended,
          COUNT(CASE WHEN al.verification_status = 'absent' THEN 1 END) as absences,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id), 2) as attendance_percent,
          CASE 
            WHEN COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < 50 THEN 'critical'
            WHEN COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < 75 THEN 'high'
            WHEN COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT cs.id) < 85 THEN 'medium'
            ELSE 'low'
          END as risk_level
        FROM classes c
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        GROUP BY c.id, c.course_code, c.course_name
        HAVING COUNT(DISTINCT cs.id) > 0
        ORDER BY attendance_percent ASC`,
        [studentId]
      );

      return results.map(row => ({
        courseId: row.id,
        courseCode: row.course_code,
        courseName: row.course_name,
        totalSessions: row.total_sessions,
        attended: row.attended,
        absences: row.absences,
        attendancePercent: row.attendance_percent,
        riskLevel: row.risk_level,
      }));
    } catch (error) {
      logger.error('Error calculating absentee risk:', error);
      throw error;
    }
  },

  // Get attendance summary for a date range
  async getAttendanceSummary(studentId, startDate, endDate) {
    try {
      const [results] = await db.execute(
        `SELECT 
          COUNT(DISTINCT al.session_id) as total_sessions,
          COUNT(CASE WHEN al.verification_status = 'success' THEN 1 END) as on_time,
          COUNT(CASE WHEN al.verification_status = 'late' THEN 1 END) as late,
          COUNT(CASE WHEN al.verification_status = 'absent' THEN 1 END) as absent,
          COUNT(CASE WHEN al.verification_status IN ('spoofed_location', 'invalid_fingerprint', 'expired_qr') THEN 1 END) as invalid,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT al.session_id), 2) as attendance_percent
        FROM attendance_logs al
        WHERE al.student_id = ? AND DATE(al.checkin_time) BETWEEN ? AND ?`,
        [studentId, startDate, endDate]
      );

      return {
        totalSessions: results[0].total_sessions || 0,
        onTime: results[0].on_time || 0,
        late: results[0].late || 0,
        absent: results[0].absent || 0,
        invalid: results[0].invalid || 0,
        attendancePercent: results[0].attendance_percent || 0,
      };
    } catch (error) {
      logger.error('Error fetching attendance summary:', error);
      throw error;
    }
  },
};

module.exports = attendanceService;
