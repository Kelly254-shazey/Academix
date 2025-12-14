// studentManagementService.js
// Global student management: directory, flags, transfers, deactivation, analytics
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class StudentManagementService {
  /**
   * Get all students with filters
   */
  async getAllStudents(filters = {}) {
    try {

      let query = `
        SELECT 
          u.id, u.name, u.email, u.phone, u.is_active,
          d.name as department_name, d.code as department_code,
          COUNT(DISTINCT ce.class_id) as class_count,
          COALESCE(AVG(al.status = 'present'), 0) as avg_attendance_percent,
          COUNT(DISTINCT sf.id) as flag_count,
          MAX(CASE WHEN sf.severity = 'critical' THEN 1 ELSE 0 END) as has_critical_flag
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN class_enrollments ce ON u.id = ce.student_id
        LEFT JOIN sessions s ON ce.class_id = s.class_id
        LEFT JOIN attendance_logs al ON al.session_id = s.id AND al.student_id = u.id
        LEFT JOIN student_flags sf ON u.id = sf.student_id AND sf.status = 'active'
        WHERE u.role = 'student'
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

      if (filters.flagged) {
        query += ` AND COUNT(DISTINCT sf.id) > 0`;
      }

      query += ` GROUP BY u.id ORDER BY u.name ASC`;

      const [results] = await db.execute(query, params);

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getAllStudents:', error);
      throw error;
    }
  }

  /**
   * Get student full profile with flags and history
   */
  async getStudentProfile(studentId) {
    try {

      // Student info
      const [student] = await db.execute(`
        SELECT u.*, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ? AND u.role = 'student'
      `, [studentId]);

      if (!student || student.length === 0) {
        throw new Error('Student not found');
      }

      // Enrolled classes
      const [classes] = await db.execute(`
        SELECT DISTINCT c.id, c.name, c.code, l.name as lecturer_name
        FROM class_enrollments ce
        INNER JOIN classes c ON ce.class_id = c.id
        LEFT JOIN users l ON c.lecturer_id = l.id
        WHERE ce.student_id = ?
        ORDER BY c.name
      `, [studentId]);

      // Active flags
      const [flags] = await db.execute(`
        SELECT id, flag_type, severity, description, recommended_action, flagged_at, flagged_by
        FROM student_flags
        WHERE student_id = ? AND status = 'active'
        ORDER BY severity DESC, flagged_at DESC
      `, [studentId]);

      // Attendance summary
      const [attendance] = await db.execute(`
        SELECT 
          COUNT(DISTINCT al.session_id) as sessions_attended,
          COUNT(DISTINCT s.id) as total_sessions,
          ROUND(
            COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.session_id END) * 100.0 /
            NULLIF(COUNT(DISTINCT s.id), 0), 2
          ) as attendance_percent
        FROM users u
        LEFT JOIN class_enrollments ce ON u.id = ce.student_id
        LEFT JOIN sessions s ON ce.class_id = s.class_id
        LEFT JOIN attendance_logs al ON al.session_id = s.id AND al.student_id = u.id AND al.status = 'present'
        WHERE u.id = ? AND s.status IN ('completed', 'active')
      `, [studentId]);

      return {
        success: true,
        data: {
          student: student[0],
          classes,
          flags,
          attendance: attendance[0],
        },
      };
    } catch (error) {
      logger.error('Error in getStudentProfile:', error);
      throw error;
    }
  }

  /**
   * Create new student account
   */
  async createStudent(data, adminId) {
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
      const [existing] = await db.execute(`
        SELECT id FROM users WHERE email = ?
      `, [data.email]);

      if (existing && existing.length > 0) {
        throw new Error('Email already exists');
      }

      // Create user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const [result] = await db.execute(`
        INSERT INTO users (
          name, email, password, phone, role, department_id, is_active
        ) VALUES (?, ?, ?, ?, 'student', ?, TRUE)
      `, [
        data.name,
        data.email,
        hashedPassword,
        data.phone,
        data.department_id,
      ]);

      logger.info(`Student ${data.name} created by admin ${adminId}`);

      return {
        success: true,
        data: {
          studentId: result.insertId,
          name: data.name,
          email: data.email,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in createStudent:', error);
      throw error;
    }
  }

  /**
   * Update student information
   */
  async updateStudent(studentId, data, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [result] = await db.execute(`
        UPDATE users
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            is_active = COALESCE(?, is_active)
        WHERE id = ? AND role = 'student'
      `, [
        data.name,
        data.phone,
        data.is_active,
        studentId,
      ]);

      return {
        success: result.affectedRows > 0,
        data: { studentId, updated: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in updateStudent:', error);
      throw error;
    }
  }

  /**
   * Flag student for intervention
   */
  async flagStudent(studentId, flagType, severity, description, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [result] = await db.execute(`
        INSERT INTO student_flags (
          student_id, flag_type, severity, description,
          status, flagged_by, flagged_at
        ) VALUES (?, ?, ?, ?, 'active', ?, NOW())
      `, [
        studentId,
        flagType,
        severity,
        description,
        adminId,
      ]);

      logger.info(`Student ${studentId} flagged as ${flagType} (${severity}) by admin ${adminId}`);

      return {
        success: true,
        data: {
          flagId: result.insertId,
          studentId,
          flagType,
          severity,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in flagStudent:', error);
      throw error;
    }
  }

  /**
   * Transfer student to another department
   */
  async transferStudent(studentId, toDepartmentId, reason, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Get current department
      const [student] = await db.execute(`
        SELECT department_id FROM users WHERE id = ? AND role = 'student'
      `, [studentId]);

      if (!student || student.length === 0) {
        throw new Error('Student not found');
      }

      // Create transfer record
      const [result] = await db.execute(`
        INSERT INTO student_transfers (
          student_id, from_department_id, to_department_id,
          reason, status, requested_at, approved_by, approved_at
        ) VALUES (?, ?, ?, ?, 'approved', NOW(), ?, NOW())
      `, [
        studentId,
        student[0].department_id,
        toDepartmentId,
        reason,
        adminId,
      ]);

      // Update student department
      await db.execute(`
        UPDATE users SET department_id = ? WHERE id = ?
      `, [toDepartmentId, studentId]);

      logger.info(`Student ${studentId} transferred from dept ${student[0].department_id} to ${toDepartmentId} by admin ${adminId}`);

      return {
        success: true,
        data: {
          transferId: result.insertId,
          studentId,
          fromDepartmentId: student[0].department_id,
          toDepartmentId,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in transferStudent:', error);
      throw error;
    }
  }

  /**
   * Deactivate student account
   */
  async deactivateStudent(studentId, adminId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [result] = await db.execute(`
        UPDATE users SET is_active = FALSE WHERE id = ? AND role = 'student'
      `, [studentId]);

      logger.info(`Student ${studentId} deactivated by admin ${adminId}`);

      return {
        success: result.affectedRows > 0,
        data: { studentId, deactivated: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in deactivateStudent:', error);
      throw error;
    }
  }

  /**
   * Get attendance history
   */
  async getAttendanceHistory(studentId, limit = 50) {
    try {

      const [results] = await db.execute(`
        SELECT 
          al.id, al.session_id, s.session_date, s.start_time, s.end_time,
          c.name as class_name, c.code as class_code,
          l.name as lecturer_name,
          al.status, al.marked_at
        FROM attendance_logs al
        INNER JOIN sessions s ON al.session_id = s.id
        INNER JOIN classes c ON s.class_id = c.id
        INNER JOIN users l ON c.lecturer_id = l.id
        WHERE al.student_id = ?
        ORDER BY s.session_date DESC
        LIMIT ?
      `, [studentId, limit]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getAttendanceHistory:', error);
      throw error;
    }
  }

  /**
   * Get at-risk students in department
   */
  async getAtRiskStudents(departmentId, threshold = 75) {
    try {

      const [results] = await db.execute(`
        SELECT 
          u.id, u.name, u.email,
          ROUND(AVG(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) * 100, 2) as attendance_percent,
          COUNT(DISTINCT sf.id) as flag_count
        FROM users u
        LEFT JOIN class_enrollments ce ON u.id = ce.student_id
        LEFT JOIN sessions s ON ce.class_id = s.class_id
        LEFT JOIN attendance_logs al ON al.session_id = s.id AND al.student_id = u.id
        LEFT JOIN student_flags sf ON u.id = sf.student_id AND sf.status = 'active'
        WHERE u.role = 'student' AND u.department_id = ?
        GROUP BY u.id
        HAVING attendance_percent < ? OR flag_count > 0
        ORDER BY attendance_percent ASC
      `, [departmentId, threshold]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getAtRiskStudents:', error);
      throw error;
    }
  }
}

module.exports = new StudentManagementService();
