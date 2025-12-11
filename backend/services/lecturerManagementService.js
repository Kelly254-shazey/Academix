// lecturerManagementService.js
// Global lecturer management: directory, assignment, analytics, deactivation
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class LecturerManagementService {
  /**
   * Get all lecturers with filters
   */
  async getAllLecturers(filters = {}) {
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
          u.id, u.name, u.email, u.phone, u.is_active,
          d.name as department_name, d.code as department_code,
          COUNT(DISTINCT c.id) as class_count,
          COALESCE(AVG(al.status = 'present'), 0) as avg_attendance_percent,
          COUNT(DISTINCT s.id) as sessions_held
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN classes c ON c.lecturer_id = u.id
        LEFT JOIN sessions s ON s.class_id = c.id
        LEFT JOIN attendance_logs al ON al.session_id = s.id
        WHERE u.role = 'lecturer'
      `;

      const params = [];

      if (filters.search) {
        query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.department_id) {
        query += ` AND u.department_id = ?`;
        params.push(filters.department_id);
      }

      if (filters.is_active !== undefined) {
        query += ` AND u.is_active = ?`;
        params.push(filters.is_active);
      }

      query += ` GROUP BY u.id ORDER BY u.name ASC`;

      const [results] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getAllLecturers:', error);
      throw error;
    }
  }

  /**
   * Get lecturer profile with detailed analytics
   */
  async getLecturerProfile(lecturerId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // User info
      const [user] = await conn.query(`
        SELECT u.*, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ? AND u.role = 'lecturer'
      `, [lecturerId]);

      if (!user || user.length === 0) {
        conn.end();
        throw new Error('Lecturer not found');
      }

      // Classes taught
      const [classes] = await conn.query(`
        SELECT 
          c.id, c.name, c.code,
          COUNT(DISTINCT ce.student_id) as enrollment_count
        FROM classes c
        LEFT JOIN class_enrollments ce ON ce.class_id = c.id
        WHERE c.lecturer_id = ?
        ORDER BY c.name
      `, [lecturerId]);

      // Attendance analytics
      const [attendance] = await conn.query(`
        SELECT 
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) as cancelled_sessions,
          ROUND(
            AVG(
              (SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id AND al.status = 'present') /
              NULLIF((SELECT COUNT(*) FROM attendance_logs al WHERE al.session_id = s.id), 0) * 100
            ), 2
          ) as avg_attendance_percent
        FROM sessions s
        INNER JOIN classes c ON s.class_id = c.id
        WHERE c.lecturer_id = ?
      `, [lecturerId]);

      conn.end();

      return {
        success: true,
        data: {
          lecturer: user[0],
          classes,
          analytics: attendance[0],
        },
      };
    } catch (error) {
      logger.error('Error in getLecturerProfile:', error);
      throw error;
    }
  }

  /**
   * Create new lecturer account
   */
  async createLecturer(data, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Check if email exists
      const [existing] = await conn.query(`
        SELECT id FROM users WHERE email = ?
      `, [data.email]);

      if (existing && existing.length > 0) {
        conn.end();
        throw new Error('Email already exists');
      }

      // Create user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const insertQuery = `
        INSERT INTO users (
          name, email, password, phone, role,
          department_id, is_active
        ) VALUES (?, ?, ?, ?, 'lecturer', ?, TRUE)
      `;

      const [result] = await conn.query(insertQuery, [
        data.name,
        data.email,
        hashedPassword,
        data.phone,
        data.department_id,
      ]);

      conn.end();

      logger.info(`Lecturer ${data.name} created by admin ${adminId}`);

      return {
        success: true,
        data: {
          lecturerId: result.insertId,
          name: data.name,
          email: data.email,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in createLecturer:', error);
      throw error;
    }
  }

  /**
   * Update lecturer information
   */
  async updateLecturer(lecturerId, data, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE users
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            department_id = COALESCE(?, department_id),
            is_active = COALESCE(?, is_active)
        WHERE id = ? AND role = 'lecturer'
      `;

      const [result] = await conn.query(updateQuery, [
        data.name,
        data.phone,
        data.department_id,
        data.is_active,
        lecturerId,
      ]);

      conn.end();

      return {
        success: result.affectedRows > 0,
        data: { lecturerId, updated: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in updateLecturer:', error);
      throw error;
    }
  }

  /**
   * Deactivate or delete lecturer
   */
  async deactivateLecturer(lecturerId, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE users SET is_active = FALSE WHERE id = ? AND role = 'lecturer'
      `;

      const [result] = await conn.query(updateQuery, [lecturerId]);

      conn.end();

      logger.info(`Lecturer ${lecturerId} deactivated by admin ${adminId}`);

      return {
        success: result.affectedRows > 0,
        data: { lecturerId, deactivated: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in deactivateLecturer:', error);
      throw error;
    }
  }

  /**
   * Assign courses to lecturer
   */
  async assignCourses(lecturerId, courseIds, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const semester = Math.ceil(new Date().getMonth() / 6);
      const year = new Date().getFullYear();

      for (const courseId of courseIds) {
        const query = `
          INSERT INTO course_assignments (
            course_id, lecturer_id, department_id, semester, year, is_active
          ) SELECT ?, ?, d.id, ?, ?, TRUE
          FROM users u
          INNER JOIN departments d ON u.department_id = d.id
          WHERE u.id = ?
          ON DUPLICATE KEY UPDATE is_active = TRUE
        `;

        await conn.query(query, [courseId, lecturerId, semester, year, lecturerId]);
      }

      conn.end();

      return {
        success: true,
        data: {
          lecturerId,
          courseCount: courseIds.length,
          assigned: true,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in assignCourses:', error);
      throw error;
    }
  }
}

module.exports = new LecturerManagementService();
