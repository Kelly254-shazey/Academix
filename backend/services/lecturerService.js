// lecturerService.js
// Lecturer overview, dashboard, and profile management
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class LecturerService {
  /**
   * Get lecturer overview - today's classes, next class, quick stats
   */
  async getLecturerOverview(lecturerId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          u.id, u.full_name, u.email, u.profile_picture,
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as today_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) as active_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'not_started' AND s.start_time > NOW() THEN s.id END) as upcoming_sessions,
          COALESCE(AVG(CAST(stats.attendance_percent AS DECIMAL(5,2))), 0) as avg_attendance
        FROM users u
        LEFT JOIN classes c ON u.id = c.lecturer_id
        LEFT JOIN sessions s ON c.id = s.class_id AND DATE(s.start_time) = DATE(NOW())
        LEFT JOIN student_attendance_analytics stats ON c.id = stats.class_id
        WHERE u.id = ? AND u.role = 'lecturer'
        GROUP BY u.id
      `;

      const [results] = await conn.query(query, [lecturerId]);
      conn.end();

      if (!results || results.length === 0) {
        throw new Error('Lecturer not found');
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      logger.error('Error in getLecturerOverview:', error);
      throw error;
    }
  }

  /**
   * Get today's classes for lecturer
   */
  async getTodayClasses(lecturerId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          c.id, c.course_code, c.course_name,
          s.id as session_id, s.start_time, s.end_time, s.status,
          s.scanning_enabled, s.started_at, s.cancelled_at,
          c.room_number, c.latitude, c.longitude,
          COUNT(al.id) as enrolled_students,
          COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN al.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN al.status = 'excused' THEN 1 END) as excused_count,
          CASE 
            WHEN s.status = 'in_progress' THEN 'ACTIVE'
            WHEN s.status = 'completed' THEN 'COMPLETED'
            WHEN s.cancelled_at IS NOT NULL THEN 'CANCELLED'
            WHEN s.start_time > NOW() THEN 'UPCOMING'
            ELSE 'NOT_STARTED'
          END as class_state
        FROM classes c
        LEFT JOIN sessions s ON c.id = s.class_id AND DATE(s.start_time) = DATE(NOW())
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ?
        ORDER BY s.start_time ASC
      `;

      const [results] = await conn.query(query, [lecturerId]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getTodayClasses:', error);
      throw error;
    }
  }

  /**
   * Get next class for lecturer
   */
  async getNextClass(lecturerId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          c.id, c.course_code, c.course_name,
          s.id as session_id, s.start_time, s.end_time,
          c.room_number, c.latitude, c.longitude,
          TIMESTAMPDIFF(MINUTE, NOW(), s.start_time) as minutes_until,
          COUNT(DISTINCT al.student_id) as enrolled_students
        FROM classes c
        LEFT JOIN sessions s ON c.id = s.class_id
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ? 
          AND s.start_time > NOW()
        ORDER BY s.start_time ASC
        LIMIT 1
      `;

      const [results] = await conn.query(query, [lecturerId]);
      conn.end();

      return {
        success: true,
        data: results && results.length > 0 ? results[0] : null,
      };
    } catch (error) {
      logger.error('Error in getNextClass:', error);
      throw error;
    }
  }

  /**
   * Get quick attendance statistics for lecturer
   */
  async getQuickAttendanceStats(lecturerId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT CASE WHEN saa.attendance_percent >= 75 THEN c.id END) as healthy_classes,
          COUNT(DISTINCT CASE WHEN saa.attendance_percent < 75 THEN c.id END) as at_risk_classes,
          COALESCE(AVG(saa.attendance_percent), 0) as avg_attendance,
          COUNT(DISTINCT CASE WHEN ai.risk_level = 'high' THEN ai.student_id END) as high_risk_students
        FROM classes c
        LEFT JOIN student_attendance_analytics saa ON c.id = saa.class_id
        LEFT JOIN ai_predictions ai ON c.id = ai.class_id AND ai.prediction_type = 'absenteeism_risk'
        WHERE c.lecturer_id = ?
      `;

      const [results] = await conn.query(query, [lecturerId]);
      conn.end();

      return {
        success: true,
        data: results && results.length > 0 ? results[0] : {},
      };
    } catch (error) {
      logger.error('Error in getQuickAttendanceStats:', error);
      throw error;
    }
  }

  /**
   * Get alerts for lecturer
   */
  async getLecturerAlerts(lecturerId, limit = 10) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT id, class_id, alert_type, title, message, severity, is_read,
               action_url, created_at
        FROM lecturer_alerts
        WHERE lecturer_id = ? AND is_read = FALSE
        ORDER BY severity DESC, created_at DESC
        LIMIT ?
      `;

      const [results] = await conn.query(query, [lecturerId, limit]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerAlerts:', error);
      throw error;
    }
  }

  /**
   * Mark alerts as read
   */
  async markAlertsAsRead(lecturerId, alertIds) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const placeholders = alertIds.map(() => '?').join(',');
      const query = `
        UPDATE lecturer_alerts
        SET is_read = TRUE, read_at = NOW()
        WHERE lecturer_id = ? AND id IN (${placeholders})
      `;

      const params = [lecturerId, ...alertIds];
      const [result] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        message: `${result.affectedRows} alert(s) marked as read`,
      };
    } catch (error) {
      logger.error('Error in markAlertsAsRead:', error);
      throw error;
    }
  }

  /**
   * Get lecturer statistics
   */
  async getLecturerStatistics(lecturerId, startDate, endDate) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          DATE(s.start_time) as date,
          COUNT(DISTINCT s.id) as sessions_held,
          COUNT(DISTINCT c.id) as classes,
          COUNT(DISTINCT al.student_id) as students_enrolled,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as students_present,
          ROUND(100 * COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / 
                NULLIF(COUNT(DISTINCT al.student_id), 0), 2) as attendance_percent
        FROM sessions s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ? AND DATE(s.start_time) BETWEEN ? AND ?
        GROUP BY DATE(s.start_time)
        ORDER BY date DESC
      `;

      const [results] = await conn.query(query, [lecturerId, startDate, endDate]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerStatistics:', error);
      throw error;
    }
  }
}

module.exports = new LecturerService();
