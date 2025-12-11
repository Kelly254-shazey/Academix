// analyticsService.js
// Advanced analytics: KPI calculations, trends, drill-downs, comparative analysis
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class AnalyticsService {
  /**
   * Get KPI drill-down for specific metric
   */
  async getKPIDrillDown(metricType, departmentId, dateRange = {}) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      let query = '';
      const params = [];

      switch (metricType) {
        case 'attendance':
          query = `
            SELECT 
              DATE(s.session_date) as date,
              c.name as class_name,
              COUNT(DISTINCT al.student_id) as students_present,
              COUNT(DISTINCT al.student_id) as total_marked,
              ROUND(COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) * 100.0 /
                NULLIF(COUNT(DISTINCT al.student_id), 0), 2) as attendance_percent
            FROM sessions s
            INNER JOIN classes c ON s.class_id = c.id
            LEFT JOIN attendance_logs al ON s.id = al.session_id
            WHERE c.department_id = ? AND DATE(s.session_date) BETWEEN ? AND ?
            GROUP BY DATE(s.session_date), c.id
            ORDER BY date DESC
          `;
          params.push(departmentId, dateRange.startDate, dateRange.endDate);
          break;

        case 'performance':
          query = `
            SELECT 
              u.id, u.name,
              COUNT(DISTINCT c.id) as class_count,
              ROUND(AVG(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) * 100, 2) as attendance_percent
            FROM users u
            LEFT JOIN class_enrollments ce ON u.id = ce.student_id
            LEFT JOIN classes c ON ce.class_id = c.id
            LEFT JOIN sessions s ON c.id = s.class_id
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = u.id
            WHERE u.role = 'student' AND c.department_id = ?
            GROUP BY u.id
            ORDER BY attendance_percent ASC
            LIMIT 100
          `;
          params.push(departmentId);
          break;

        case 'enrollment':
          query = `
            SELECT 
              c.name as class_name,
              c.code,
              COUNT(DISTINCT ce.student_id) as enrollment_count,
              COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as students_present,
              ROUND(COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) * 100.0 /
                NULLIF(COUNT(DISTINCT ce.student_id), 0), 2) as avg_attendance
            FROM classes c
            LEFT JOIN class_enrollments ce ON c.id = ce.class_id
            LEFT JOIN sessions s ON c.id = s.class_id
            LEFT JOIN attendance_logs al ON s.id = al.session_id
            WHERE c.department_id = ?
            GROUP BY c.id
            ORDER BY enrollment_count DESC
          `;
          params.push(departmentId);
          break;

        default:
          conn.end();
          throw new Error('Invalid metric type');
      }

      const [results] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: results || [],
        metricType,
        departmentId,
      };
    } catch (error) {
      logger.error('Error in getKPIDrillDown:', error);
      throw error;
    }
  }

  /**
   * Get comparative analytics between departments
   */
  async getComparativeAnalytics(startDate, endDate) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [results] = await conn.query(`
        SELECT 
          d.id,
          d.name as department_name,
          d.code,
          COUNT(DISTINCT u.id) as total_students,
          COUNT(DISTINCT l.id) as total_lecturers,
          COUNT(DISTINCT c.id) as total_classes,
          ROUND(AVG(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) * 100, 2) as avg_attendance,
          COUNT(DISTINCT CASE WHEN sf.status = 'active' THEN sf.id END) as at_risk_students
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.role = 'student'
        LEFT JOIN users l ON d.id = l.department_id AND l.role = 'lecturer'
        LEFT JOIN classes c ON d.id = c.department_id
        LEFT JOIN sessions s ON c.id = s.class_id AND DATE(s.session_date) BETWEEN ? AND ?
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        LEFT JOIN student_flags sf ON u.id = sf.student_id
        GROUP BY d.id
        ORDER BY avg_attendance DESC
      `, [startDate, endDate]);

      conn.end();

      return {
        success: true,
        data: results || [],
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      logger.error('Error in getComparativeAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get trend predictions
   */
  async getTrendPredictions(metricType, days = 30) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [historical] = await conn.query(`
        SELECT 
          DATE(metric_date) as date,
          AVG(avg_attendance_percent) as avg_attendance,
          SUM(at_risk_students) as at_risk_count,
          COUNT(DISTINCT department_id) as active_departments
        FROM department_metrics
        WHERE metric_date >= ?
        GROUP BY DATE(metric_date)
        ORDER BY date ASC
      `, [startDate]);

      conn.end();

      // Simple trend calculation
      const trend = this._calculateTrend(historical);

      return {
        success: true,
        data: historical,
        trend,
        metricType,
        period: days,
      };
    } catch (error) {
      logger.error('Error in getTrendPredictions:', error);
      throw error;
    }
  }

  /**
   * Get attendance anomalies
   */
  async getAttendanceAnomalies(threshold = 50) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [anomalies] = await conn.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          d.name as department,
          ROUND(
            COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.session_id END) * 100.0 /
            NULLIF(COUNT(DISTINCT s.id), 0), 2
          ) as attendance_percent,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT sf.id) as active_flags
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN class_enrollments ce ON u.id = ce.student_id
        LEFT JOIN sessions s ON ce.class_id = s.class_id AND s.status = 'completed'
        LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = u.id
        LEFT JOIN student_flags sf ON u.id = sf.student_id AND sf.status = 'active'
        WHERE u.role = 'student'
        GROUP BY u.id
        HAVING attendance_percent < ? OR active_flags > 0
        ORDER BY attendance_percent ASC
      `, [threshold]);

      conn.end();

      return {
        success: true,
        data: anomalies || [],
        threshold,
        count: anomalies ? anomalies.length : 0,
      };
    } catch (error) {
      logger.error('Error in getAttendanceAnomalies:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate trend direction
   */
  _calculateTrend(data) {
    if (data.length < 2) return 'neutral';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const avgFirst = firstHalf.reduce((sum, item) => sum + (item.avg_attendance || 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, item) => sum + (item.avg_attendance || 0), 0) / secondHalf.length;

    if (avgSecond > avgFirst) return 'upward';
    if (avgSecond < avgFirst) return 'downward';
    return 'neutral';
  }
}

module.exports = new AnalyticsService();
