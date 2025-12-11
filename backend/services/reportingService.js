// reportingService.js
// Async reporting: PDF/Excel generation, scheduled reports, email delivery
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class ReportingService {
  /**
   * Create async export job
   */
  async createExportJob(exportType, format, filters, requestedBy) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [result] = await conn.query(`
        INSERT INTO export_jobs (
          job_id, requested_by, export_type, file_format,
          filter_criteria, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
      `, [
        jobId,
        requestedBy,
        exportType,
        format,
        JSON.stringify(filters),
      ]);

      conn.end();

      // Trigger async processing (would normally queue to job processor)
      logger.info(`Export job ${jobId} created for ${exportType} as ${format}`);

      return {
        success: true,
        data: {
          jobId,
          status: 'pending',
          exportType,
          format,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in createExportJob:', error);
      throw error;
    }
  }

  /**
   * Get export job status
   */
  async getExportJobStatus(jobId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [job] = await conn.query(`
        SELECT 
          id, job_id, export_type, file_format, status,
          progress_percent, total_records, processed_records,
          file_path, file_size, download_count,
          created_at, started_at, completed_at, error_message
        FROM export_jobs
        WHERE job_id = ?
      `, [jobId]);

      conn.end();

      if (!job || job.length === 0) {
        throw new Error('Export job not found');
      }

      return {
        success: true,
        data: job[0],
      };
    } catch (error) {
      logger.error('Error in getExportJobStatus:', error);
      throw error;
    }
  }

  /**
   * List all export jobs
   */
  async listExportJobs(filters = {}, limit = 50, offset = 0) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      let query = `
        SELECT 
          id, job_id, export_type, file_format, status,
          progress_percent, created_at, completed_at
        FROM export_jobs
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.exportType) {
        query += ` AND export_type = ?`;
        params.push(filters.exportType);
      }

      if (filters.requestedBy) {
        query += ` AND requested_by = ?`;
        params.push(filters.requestedBy);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [jobs] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: jobs || [],
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error in listExportJobs:', error);
      throw error;
    }
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(departmentId, startDate, endDate) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [data] = await conn.query(`
        SELECT 
          DATE(s.session_date) as date,
          c.name as class_name,
          COUNT(DISTINCT ce.student_id) as enrolled_students,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as students_present,
          ROUND(
            COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) * 100.0 /
            NULLIF(COUNT(DISTINCT ce.student_id), 0), 2
          ) as attendance_percent
        FROM classes c
        INNER JOIN sessions s ON c.id = s.class_id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.department_id = ? AND DATE(s.session_date) BETWEEN ? AND ?
        GROUP BY DATE(s.session_date), c.id
        ORDER BY date DESC
      `, [departmentId, startDate, endDate]);

      conn.end();

      const summary = {
        totalClasses: data.length,
        avgAttendance: data.length > 0 
          ? (data.reduce((sum, row) => sum + (row.attendance_percent || 0), 0) / data.length).toFixed(2)
          : 0,
      };

      return {
        success: true,
        data,
        summary,
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      logger.error('Error in generateAttendanceReport:', error);
      throw error;
    }
  }

  /**
   * Generate department performance report
   */
  async generateDepartmentReport(departmentId, metrics = ['attendance', 'enrollment', 'flags']) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const report = {};

      if (metrics.includes('attendance')) {
        const [attendance] = await conn.query(`
          SELECT 
            ROUND(AVG(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) * 100, 2) as avg_attendance,
            COUNT(DISTINCT s.id) as total_sessions
          FROM sessions s
          INNER JOIN classes c ON s.class_id = c.id
          LEFT JOIN attendance_logs al ON s.id = al.session_id
          WHERE c.department_id = ? AND s.status = 'completed'
        `, [departmentId]);
        report.attendance = attendance[0];
      }

      if (metrics.includes('enrollment')) {
        const [enrollment] = await conn.query(`
          SELECT 
            COUNT(DISTINCT u.id) as total_students,
            COUNT(DISTINCT c.id) as total_classes,
            ROUND(AVG(enrollment_count), 0) as avg_class_size
          FROM users u
          LEFT JOIN class_enrollments ce ON u.id = ce.student_id
          LEFT JOIN classes c ON ce.class_id = c.id
          WHERE u.department_id = ? AND u.role = 'student'
        `, [departmentId]);
        report.enrollment = enrollment[0];
      }

      if (metrics.includes('flags')) {
        const [flags] = await conn.query(`
          SELECT 
            COUNT(DISTINCT CASE WHEN severity = 'critical' THEN student_id END) as critical_flags,
            COUNT(DISTINCT CASE WHEN severity = 'warning' THEN student_id END) as warning_flags,
            COUNT(DISTINCT flag_type) as flag_types
          FROM student_flags
          WHERE status = 'active' AND student_id IN (
            SELECT id FROM users WHERE department_id = ? AND role = 'student'
          )
        `, [departmentId]);
        report.flags = flags[0];
      }

      conn.end();

      return {
        success: true,
        data: report,
        departmentId,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error in generateDepartmentReport:', error);
      throw error;
    }
  }

  /**
   * Cancel export job
   */
  async cancelExportJob(jobId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [result] = await conn.query(`
        UPDATE export_jobs SET status = 'cancelled'
        WHERE job_id = ? AND status IN ('pending', 'processing')
      `, [jobId]);

      conn.end();

      return {
        success: result.affectedRows > 0,
        data: { jobId, cancelled: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in cancelExportJob:', error);
      throw error;
    }
  }
}

module.exports = new ReportingService();
