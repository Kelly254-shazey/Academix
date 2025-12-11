// departmentService.js
// Department CRUD operations, HOD assignment, metrics
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class DepartmentService {
  /**
   * Get all departments with metrics
   */
  async getAllDepartments(filters = {}) {
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
          d.id, d.name, d.code, d.description, d.is_active,
          u_hod.name as hod_name, u_hod.email as hod_email,
          COUNT(DISTINCT l.id) as lecturer_count,
          COUNT(DISTINCT ce.student_id) as student_count,
          COUNT(DISTINCT c.id) as class_count,
          COALESCE(dm.avg_attendance_percent, 0) as avg_attendance
        FROM departments d
        LEFT JOIN users u_hod ON d.hod_id = u_hod.id
        LEFT JOIN users l ON l.department_id = d.id AND l.role = 'lecturer'
        LEFT JOIN classes c ON c.department_id = d.id
        LEFT JOIN class_enrollments ce ON ce.class_id = c.id
        LEFT JOIN department_metrics dm ON dm.department_id = d.id AND DATE(dm.metric_date) = CURDATE()
        WHERE 1=1
      `;

      const params = [];

      if (filters.search) {
        query += ` AND (d.name LIKE ? OR d.code LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.is_active !== undefined) {
        query += ` AND d.is_active = ?`;
        params.push(filters.is_active);
      }

      query += ` GROUP BY d.id ORDER BY d.name ASC`;

      const [results] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getAllDepartments:', error);
      throw error;
    }
  }

  /**
   * Get department details with roster
   */
  async getDepartmentDetails(departmentId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Department info
      const [dept] = await conn.query(`
        SELECT 
          d.*, 
          u_hod.name as hod_name,
          u_deputy.name as deputy_hod_name
        FROM departments d
        LEFT JOIN users u_hod ON d.hod_id = u_hod.id
        LEFT JOIN users u_deputy ON d.deputy_hod_id = u_deputy.id
        WHERE d.id = ?
      `, [departmentId]);

      if (!dept || dept.length === 0) {
        conn.end();
        throw new Error('Department not found');
      }

      // Lecturers
      const [lecturers] = await conn.query(`
        SELECT u.id, u.name, u.email, u.phone
        FROM users u
        WHERE u.department_id = ? AND u.role = 'lecturer'
        ORDER BY u.name
      `, [departmentId]);

      // Classes
      const [classes] = await conn.query(`
        SELECT 
          c.id, c.name, c.code,
          (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id) as enrollment_count
        FROM classes c
        WHERE c.department_id = ?
        ORDER BY c.name
      `, [departmentId]);

      // Today's metrics
      const [metrics] = await conn.query(`
        SELECT * FROM department_metrics
        WHERE department_id = ? AND DATE(metric_date) = CURDATE()
      `, [departmentId]);

      conn.end();

      return {
        success: true,
        data: {
          department: dept[0],
          lecturers,
          classes,
          today_metrics: metrics.length > 0 ? metrics[0] : null,
        },
      };
    } catch (error) {
      logger.error('Error in getDepartmentDetails:', error);
      throw error;
    }
  }

  /**
   * Create department
   */
  async createDepartment(data, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const {
        name,
        code,
        description,
        budget_allocation,
        location,
        phone,
        email,
        website,
      } = data;

      const insertQuery = `
        INSERT INTO departments (
          name, code, description, budget_allocation, location,
          phone, email, website, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
      `;

      const [result] = await conn.query(insertQuery, [
        name,
        code,
        description,
        budget_allocation,
        location,
        phone,
        email,
        website,
        adminId,
      ]);

      conn.end();

      logger.info(`Department ${name} created by admin ${adminId}`);

      return {
        success: true,
        data: {
          departmentId: result.insertId,
          name,
          code,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in createDepartment:', error);
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(departmentId, data, adminId) {
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
        UPDATE departments
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            budget_allocation = COALESCE(?, budget_allocation),
            location = COALESCE(?, location),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            website = COALESCE(?, website),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
      `;

      const [result] = await conn.query(updateQuery, [
        data.name,
        data.description,
        data.budget_allocation,
        data.location,
        data.phone,
        data.email,
        data.website,
        data.is_active,
        departmentId,
      ]);

      conn.end();

      return {
        success: result.affectedRows > 0,
        data: {
          departmentId,
          updated: result.affectedRows > 0,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in updateDepartment:', error);
      throw error;
    }
  }

  /**
   * Assign HOD to department
   */
  async assignHOD(departmentId, hodUserId, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Verify user exists and is lecturer
      const [user] = await conn.query(`
        SELECT id, name, role FROM users WHERE id = ? AND role IN ('lecturer', 'admin')
      `, [hodUserId]);

      if (!user || user.length === 0) {
        conn.end();
        throw new Error('User not found or not eligible to be HOD');
      }

      // Update department
      const updateQuery = `
        UPDATE departments SET hod_id = ? WHERE id = ?
      `;

      const [result] = await conn.query(updateQuery, [hodUserId, departmentId]);

      // Update user department assignment
      await conn.query(`
        UPDATE users SET department_id = ? WHERE id = ?
      `, [departmentId, hodUserId]);

      conn.end();

      logger.info(
        `HOD ${user[0].name} assigned to department ${departmentId} by admin ${adminId}`
      );

      return {
        success: result.affectedRows > 0,
        data: {
          departmentId,
          hodId: hodUserId,
          hodName: user[0].name,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in assignHOD:', error);
      throw error;
    }
  }

  /**
   * Delete department (with safeguards)
   */
  async deleteDepartment(departmentId, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Check if department has active courses/students
      const [check] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM classes WHERE department_id = ?) as class_count,
          (SELECT COUNT(*) FROM users WHERE department_id = ? AND role IN ('lecturer', 'student')) as user_count
      `, [departmentId, departmentId]);

      if (check[0].class_count > 0 || check[0].user_count > 0) {
        conn.end();
        throw new Error('Cannot delete department with active courses or users');
      }

      // Safe to delete
      const [result] = await conn.query(`
        DELETE FROM departments WHERE id = ?
      `, [departmentId]);

      conn.end();

      return {
        success: result.affectedRows > 0,
        data: { departmentId, deleted: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in deleteDepartment:', error);
      throw error;
    }
  }

  /**
   * Get department metrics
   */
  async getDepartmentMetrics(departmentId, startDate, endDate) {
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
          metric_date, total_students, total_lecturers, total_classes,
          avg_attendance_percent, at_risk_students, active_sessions,
          completed_sessions, cancelled_sessions
        FROM department_metrics
        WHERE department_id = ? AND DATE(metric_date) BETWEEN ? AND ?
        ORDER BY metric_date DESC
      `;

      const [results] = await conn.query(query, [departmentId, startDate, endDate]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getDepartmentMetrics:', error);
      throw error;
    }
  }
}

module.exports = new DepartmentService();
