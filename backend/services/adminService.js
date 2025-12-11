// adminService.js
// Core admin dashboard operations: overview, KPIs, institution stats
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class AdminService {
  /**
   * Get institution overview with KPIs
   */
  async getInstitutionOverview(adminId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Total counts
      const [totals] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
          (SELECT COUNT(*) FROM departments) as total_departments,
          (SELECT COUNT(*) FROM classes) as total_classes,
          (SELECT COUNT(*) FROM sessions) as total_sessions,
          (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super-admin')) as total_admins
      `);

      // Today's stats
      const [todayStats] = await conn.query(`
        SELECT 
          COUNT(DISTINCT s.id) as today_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) as active_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) as cancelled_sessions,
          ROUND(
            AVG(
              (SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id AND al.status = 'present') /
              (SELECT COUNT(*) FROM class_enrollments WHERE class_id = s.class_id) * 100
            ), 2
          ) as avg_attendance
        FROM sessions s
        WHERE DATE(s.session_date) = CURDATE()
      `);

      // Department overview
      const [departments] = await conn.query(`
        SELECT 
          d.id,
          d.name,
          d.code,
          COUNT(DISTINCT u.id) as lecturer_count,
          (SELECT COUNT(*) FROM class_enrollments ce 
            INNER JOIN classes c ON ce.class_id = c.id 
            WHERE c.department_id = d.id) as student_count,
          COUNT(DISTINCT c.id) as class_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.role = 'lecturer'
        LEFT JOIN classes c ON c.department_id = d.id
        WHERE d.is_active = TRUE
        GROUP BY d.id
        ORDER BY student_count DESC
        LIMIT 10
      `);

      // Alerts and critical issues
      const [alerts] = await conn.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN sf.severity = 'critical' THEN sf.student_id END) as critical_students,
          COUNT(DISTINCT CASE WHEN sf.flag_type = 'low_attendance' THEN sf.student_id END) as low_attendance_count,
          COUNT(DISTINCT CASE WHEN sf.flag_type = 'poor_performance' THEN sf.student_id END) as poor_performance_count,
          (SELECT COUNT(*) FROM broadcasts WHERE DATE(broadcast_at) = CURDATE() AND is_active = TRUE) as today_broadcasts
        FROM student_flags sf
        WHERE sf.status = 'active'
      `);

      // Attendance trends (last 7 days)
      const [trends] = await conn.query(`
        SELECT 
          DATE(s.session_date) as date,
          COUNT(DISTINCT s.id) as sessions_held,
          ROUND(
            AVG(
              (SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id AND al.status = 'present') /
              NULLIF((SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id), 0) * 100
            ), 2
          ) as avg_attendance_percent
        FROM sessions s
        WHERE DATE(s.session_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND s.status != 'cancelled'
        GROUP BY DATE(s.session_date)
        ORDER BY date DESC
      `);

      conn.end();

      return {
        success: true,
        data: {
          totals: totals[0],
          today: todayStats[0],
          departments: departments,
          alerts: alerts[0],
          attendance_trends: trends,
        },
      };
    } catch (error) {
      logger.error('Error in getInstitutionOverview:', error);
      throw error;
    }
  }

  /**
   * Get system-wide notifications
   */
  async getSystemNotifications(adminId, limit = 50) {
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
          id, title, message, priority, target_type, 
          broadcast_at, expires_at, is_active
        FROM broadcasts
        WHERE is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY broadcast_at DESC
        LIMIT ?
      `;

      const [results] = await conn.query(query, [limit]);
      conn.end();

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getSystemNotifications:', error);
      throw error;
    }
  }

  /**
   * Get admin dashboard summary
   */
  async getAdminDashboardSummary() {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Get key metrics
      const [metrics] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) as active_students,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer' AND is_active = TRUE) as active_lecturers,
          (SELECT COUNT(*) FROM export_jobs WHERE status = 'pending') as pending_exports,
          (SELECT COUNT(*) FROM ai_jobs WHERE status = 'running') as running_ai_jobs,
          (SELECT COUNT(*) FROM audit_logs WHERE DATE(action_timestamp) = CURDATE()) as today_actions,
          (SELECT COUNT(*) FROM privacy_requests WHERE status = 'pending') as pending_privacy_requests
      `);

      conn.end();

      return {
        success: true,
        data: metrics[0],
      };
    } catch (error) {
      logger.error('Error in getAdminDashboardSummary:', error);
      throw error;
    }
  }

  /**
   * Get KPI trends over time
   */
  async getKPITrends(startDate, endDate) {
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
          DATE(s.session_date) as date,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_sessions,
          COUNT(DISTINCT s.class_id) as unique_classes,
          ROUND(
            AVG(
              (SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id AND al.status = 'present') /
              NULLIF((SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id), 0) * 100
            ), 2
          ) as avg_attendance_percent,
          (SELECT COUNT(*) FROM audit_logs WHERE DATE(action_timestamp) = DATE(s.session_date)) as admin_actions
        FROM sessions s
        WHERE DATE(s.session_date) BETWEEN ? AND ?
          AND s.status != 'cancelled'
        GROUP BY DATE(s.session_date)
        ORDER BY date ASC
      `;

      const [results] = await conn.query(query, [startDate, endDate]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getKPITrends:', error);
      throw error;
    }
  }

  /**
   * Audit log helper
   */
  async auditLog(conn, data) {
    const query = `
      INSERT INTO audit_logs (
        user_id, actor_role, action, resource_type, resource_id, resource_name,
        old_value, new_value, device_id, device_fingerprint, status,
        severity, department_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await conn.query(query, [
        data.user_id,
        data.actor_role || 'admin',
        data.action,
        data.resource_type,
        data.resource_id,
        data.resource_name,
        data.old_value ? JSON.stringify(data.old_value) : null,
        data.new_value ? JSON.stringify(data.new_value) : null,
        data.device_id,
        data.device_fingerprint,
        data.status || 'success',
        data.severity || 'low',
        data.department_id,
      ]);
    } catch (error) {
      logger.error('Error logging admin audit:', error);
    }
  }
}

module.exports = new AdminService();
