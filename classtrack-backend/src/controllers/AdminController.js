/**
 * Admin Controller
 * Dashboard, analytics, and system management
 */

const db = require('../config/database');
const AIService = require('../services/AIService');

class AdminController {
  /**
   * Get admin dashboard data
   * GET /api/admin/dashboard
   */
  static async getDashboard(req, res) {
    try {
      // Get total statistics
      const stats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
          (SELECT COUNT(*) FROM classes) as total_classes,
          (SELECT COUNT(*) FROM class_sessions WHERE status = 'ongoing') as active_sessions,
          (SELECT COUNT(*) FROM attendance_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as today_checkins
      `);

      // Get latest alerts
      const alerts = await db.query(`
        SELECT 
          al.id, al.student_id, al.verification_status, al.created_at,
          u.name as student_name, c.course_name
        FROM attendance_logs al
        JOIN users u ON al.student_id = u.id
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        WHERE al.verification_status IN ('gps_fail', 'spoofed')
        AND al.created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY al.created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        dashboard: {
          stats: stats.rows[0],
          recent_alerts: alerts.rows,
        },
      });
    } catch (err) {
      console.error('Get dashboard error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard',
      });
    }
  }

  /**
   * Get system analytics
   * GET /api/admin/analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { courseId, daysBack = 30 } = req.query;

      const result = await AIService.analyzeCourseTrends(courseId, daysBack);

      res.json(result);
    } catch (err) {
      console.error('Get analytics error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
      });
    }
  }

  /**
   * Get at-risk students
   * GET /api/admin/at-risk-students
   */
  static async getAtRiskStudents(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          u.id, u.name, u.email,
          COUNT(DISTINCT cs.id) as classes_enrolled,
          COUNT(DISTINCT al.id) as attended,
          ROUND(COUNT(DISTINCT al.id) * 100.0 / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_rate
        FROM users u
        JOIN attendance_logs al ON u.id = al.student_id
        JOIN class_sessions cs ON al.session_id = cs.id
        GROUP BY u.id
        HAVING COUNT(DISTINCT al.id) * 100.0 / NULLIF(COUNT(DISTINCT cs.id), 0) < 75
        ORDER BY attendance_rate ASC
        LIMIT 20
      `);

      res.json({
        success: true,
        at_risk_students: result.rows,
      });
    } catch (err) {
      console.error('Get at-risk students error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch at-risk students',
      });
    }
  }

  /**
   * Get security alerts
   * GET /api/admin/security-alerts
   */
  static async getSecurityAlerts(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          DATE_TRUNC('hour', al.created_at) as hour,
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN verification_status = 'spoofed' THEN 1 END) as spoofed,
          COUNT(CASE WHEN verification_status = 'gps_fail' THEN 1 END) as gps_failed
        FROM attendance_logs al
        WHERE al.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY hour
        ORDER BY hour DESC
      `);

      res.json({
        success: true,
        security_data: result.rows,
      });
    } catch (err) {
      console.error('Get security alerts error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security alerts',
      });
    }
  }

  /**
   * Create user (admin only)
   * POST /api/admin/users
   */
  static async createUser(req, res) {
    try {
      const { name, email, password, role, department_id } = req.body;

      // Hash password
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();

      const result = await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, department_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, name, email, role`,
        [userId, name, email, passwordHash, role, department_id],
      );

      res.status(201).json({
        success: true,
        user: result.rows[0],
      });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }

  /**
   * Export attendance report (CSV)
   * GET /api/admin/reports/attendance-export
   */
  static async exportAttendanceReport(req, res) {
    try {
      const { courseId, format = 'csv' } = req.query;

      const result = await db.query(`
        SELECT 
          u.name as student_name, u.email,
          c.course_name, c.course_code,
          al.check_in_timestamp,
          al.verification_status
        FROM attendance_logs al
        JOIN users u ON al.student_id = u.id
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        WHERE c.id = $1
        ORDER BY al.check_in_timestamp DESC
      `, [courseId]);

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: result.rows,
        });
      }
    } catch (err) {
      console.error('Export report error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to export report',
      });
    }
  }

  static convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    data.forEach((row) => {
      csv.push(
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(','),
      );
    });

    return csv.join('\n');
  }
}

module.exports = AdminController;
