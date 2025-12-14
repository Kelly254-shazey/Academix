// adminService.js
// Core admin dashboard operations: overview, KPIs, institution stats
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class AdminService {
  /**
   * Get institution overview with KPIs
   */
  async getInstitutionOverview(adminId) {
    try {
      // Total counts
      const [totals] = await db.execute(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
          (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super-admin')) as total_admins,
          (SELECT COUNT(*) FROM departments) as total_departments,
          (SELECT COUNT(*) FROM classes) as total_classes,
          (SELECT COUNT(*) FROM attendance_logs) as total_attendance_records,
          (SELECT COUNT(*) FROM class_sessions WHERE session_date >= CURDATE()) as active_sessions
      `);

      // Today's stats
      const [todayStats] = await db.execute(`
        SELECT
          COUNT(DISTINCT cs.id) as today_sessions,
          COUNT(DISTINCT al.id) as today_attendance,
          ROUND(
            CASE
              WHEN COUNT(DISTINCT cs.id) > 0
              THEN (COUNT(DISTINCT al.id) / COUNT(DISTINCT cs.id)) * 100
              ELSE 0
            END, 2
          ) as avg_attendance_today
        FROM class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id
        WHERE DATE(cs.session_date) = CURDATE()
      `);

      // Low attendance students (less than 70% attendance)
      const [lowAttendance] = await db.execute(`
        SELECT COUNT(*) as low_attendance_students
        FROM (
          SELECT
            u.id,
            COUNT(al.id) / COUNT(DISTINCT cs.id) * 100 as attendance_rate
          FROM users u
          JOIN class_sessions cs ON u.id = cs.student_id
          LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
          WHERE u.role = 'student'
          GROUP BY u.id
          HAVING attendance_rate < 70
        ) as low_attendance
      `);

      // Unread messages (support tickets)
      const [unreadMessages] = await db.execute(`
        SELECT COUNT(*) as unread_messages
        FROM support_tickets
        WHERE status = 'open'
      `);

      // System alerts (recent errors or issues)
      const [systemAlerts] = await db.execute(`
        SELECT COUNT(*) as system_alerts
        FROM audit_logs
        WHERE action_type = 'error'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

      const totalsData = totals[0];
      const todayData = todayStats[0];
      const lowAttendanceData = lowAttendance[0];
      const messagesData = unreadMessages[0];
      const alertsData = systemAlerts[0];

      return {
        success: true,
        data: {
          totalUsers: totalsData.total_users || 0,
          totalStudents: totalsData.total_students || 0,
          totalLecturers: totalsData.total_lecturers || 0,
          totalAdmins: totalsData.total_admins || 0,
          totalDepartments: totalsData.total_departments || 0,
          totalClasses: totalsData.total_classes || 0,
          totalAttendanceRecords: totalsData.total_attendance_records || 0,
          activeSessions: totalsData.active_sessions || 0,
          todaySessions: todayData.today_sessions || 0,
          todayAttendance: todayData.today_attendance || 0,
          avgAttendanceToday: todayData.avg_attendance_today || 0,
          lowAttendanceStudents: lowAttendanceData.low_attendance_students || 0,
          unreadMessages: messagesData.unread_messages || 0,
          systemAlerts: alertsData.system_alerts || 0
        }
      };

    } catch (error) {
      logger.error('Error getting institution overview:', error);
      throw error;
    }
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(adminId, limit = 10) {
    try {
      const [activities] = await db.execute(`
        SELECT
          'user_registration' as type,
          CONCAT('New user registered: ', u.first_name, ' ', u.last_name) as description,
          u.created_at as timestamp
        FROM users u
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT
          'attendance_recorded' as type,
          CONCAT('Attendance recorded for class session') as description,
          al.checkin_time as timestamp
        FROM attendance_logs al
        WHERE al.checkin_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT
          'class_session_created' as type,
          CONCAT('New class session created') as description,
          cs.created_at as timestamp
        FROM class_sessions cs
        WHERE cs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY timestamp DESC
        LIMIT ?
      `, [limit]);

      return {
        success: true,
        data: activities || []
      };

    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get attendance trends data
   */
  async getAttendanceTrends(adminId, days = 7) {
    try {
      const [trends] = await db.execute(`
        SELECT
          c.class_name,
          DATE(cs.session_date) as date,
          ROUND(
            (COUNT(al.id) / COUNT(DISTINCT cs.id)) * 100, 2
          ) as attendance_rate,
          LAG(
            ROUND(
              (COUNT(al.id) / COUNT(DISTINCT cs.id)) * 100, 2
            )
          ) OVER (PARTITION BY c.id ORDER BY DATE(cs.session_date)) as previous_rate
        FROM classes c
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        LEFT JOIN attendance_logs al ON cs.id = al.session_id
        WHERE cs.session_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY c.id, c.class_name, DATE(cs.session_date)
        ORDER BY DATE(cs.session_date) DESC, c.class_name
        LIMIT 20
      `, [days]);

      const trendsWithChange = trends.map(trend => ({
        className: trend.class_name,
        date: trend.date.toISOString().split('T')[0],
        attendanceRate: trend.attendance_rate || 0,
        change: trend.previous_rate ? (trend.attendance_rate - trend.previous_rate) : 0,
        trend: trend.previous_rate ?
          (trend.attendance_rate > trend.previous_rate ? 'up' :
           trend.attendance_rate < trend.previous_rate ? 'down' : 'stable') : 'stable'
      }));

      return {
        success: true,
        data: trendsWithChange || []
      };

    } catch (error) {
      logger.error('Error getting attendance trends:', error);
      throw error;
    }
  }

  /**
   * Get system-wide notifications
   */
  async getSystemNotifications(adminId, limit = 50) {
    try {
      

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

      const [results] = await db.execute(query, [limit]);

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
      // Get key metrics for admin dashboard
      const [metrics] = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM users) as totalUsers,
          (SELECT COUNT(*) FROM users WHERE role = 'student') as totalStudents,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as totalLecturers,
          (SELECT COUNT(*) FROM users WHERE role = 'admin' OR role = 'superadmin') as totalAdmins,
          (SELECT COUNT(*) FROM departments) as totalDepartments,
          (SELECT COUNT(*) FROM classes) as totalClasses,
          (SELECT COUNT(*) FROM attendance_logs) as totalAttendanceRecords,
          (SELECT COUNT(DISTINCT session_id) FROM attendance_logs WHERE DATE(created_at) = CURDATE()) as todaySessions,
          (SELECT COUNT(*) FROM attendance_logs WHERE DATE(created_at) = CURDATE() AND verification_status = 'verified') as todayAttendance,
          (SELECT COUNT(DISTINCT user_id) FROM notifications WHERE is_read = FALSE) as unreadMessages
      `);

      const dashboardData = metrics[0] || {};
      
      return {
        totalUsers: dashboardData.totalUsers || 0,
        totalLecturers: dashboardData.totalLecturers || 0,
        totalStudents: dashboardData.totalStudents || 0,
        totalAdmins: dashboardData.totalAdmins || 0,
        totalDepartments: dashboardData.totalDepartments || 0,
        totalClasses: dashboardData.totalClasses || 0,
        totalAttendanceRecords: dashboardData.totalAttendanceRecords || 0,
        activeSessions: dashboardData.todaySessions || 0,
        todaySessions: dashboardData.todaySessions || 0,
        todayAttendance: dashboardData.todayAttendance || 0,
        avgAttendanceToday: dashboardData.todayAttendance || 0,
        lowAttendanceStudents: 0,
        unreadMessages: dashboardData.unreadMessages || 0,
        systemAlerts: 0
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

      const [results] = await db.execute(query, [startDate, endDate]);

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
   * Get all users with filtering and pagination
   */
  async getAllUsers(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.role && filters.role !== 'all') {
        whereClause += ' AND u.role = ?';
        params.push(filters.role);
      }

      if (filters.department_id) {
        whereClause += ' AND u.department_id = ?';
        params.push(filters.department_id);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND u.is_active = ?';
        params.push(filters.is_active);
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const [users] = await db.execute(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.student_id,
          u.employee_id,
          u.department_id,
          d.name as department_name,
          u.is_active,
          u.created_at,
          u.updated_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const [totalCount] = await db.execute(`
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `, params);

      return {
        success: true,
        data: {
          users: users || [],
          total: totalCount[0]?.total || 0,
          limit,
          offset
        }
      };

    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData, adminId) {
    try {
      const { name, email, role, department_id, student_id, employee_id } = userData;

      // Generate default password (user can change later)
      const bcrypt = require('bcrypt');
      const defaultPassword = 'password123'; // In production, send email to set password
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const [result] = await db.execute(`
        INSERT INTO users (
          name, email, password_hash, role, department_id,
          student_id, employee_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [name, email, passwordHash, role, department_id, student_id, employee_id]);

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'create', 'user', ?, NULL, ?, 'success', 'info')
      `, [adminId, result.insertId, JSON.stringify({ name, email, role })]);

      return {
        success: true,
        message: 'User created successfully',
        data: { userId: result.insertId }
      };

    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, userData, adminId) {
    try {
      const { name, email, role, department_id, student_id, employee_id, is_active } = userData;

      // Get current user data for audit
      const [currentUser] = await db.execute(
        'SELECT name, email, role, department_id, student_id, employee_id, is_active FROM users WHERE id = ?',
        [userId]
      );

      if (currentUser.length === 0) {
        throw new Error('User not found');
      }

      const oldValue = JSON.stringify(currentUser[0]);

      await db.execute(`
        UPDATE users SET
          name = ?, email = ?, role = ?, department_id = ?,
          student_id = ?, employee_id = ?, is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [name, email, role, department_id, student_id, employee_id, is_active, userId]);

      const newValue = JSON.stringify({ name, email, role, department_id, student_id, employee_id, is_active });

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'update', 'user', ?, ?, ?, 'success', 'info')
      `, [adminId, userId, oldValue, newValue]);

      return {
        success: true,
        message: 'User updated successfully'
      };

    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId, adminId) {
    try {
      // Get user data for audit before deletion
      const [user] = await db.execute(
        'SELECT name, email, role FROM users WHERE id = ?',
        [userId]
      );

      if (user.length === 0) {
        throw new Error('User not found');
      }

      await db.execute('DELETE FROM users WHERE id = ?', [userId]);

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'delete', 'user', ?, ?, NULL, 'success', 'warning')
      `, [adminId, userId, JSON.stringify(user[0])]);

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Bulk upload users from CSV/Excel file
   */
  async bulkUploadUsers(file, adminId) {
    try {
      const csv = require('csv-parser');
      const fs = require('fs');
      const path = require('path');
      const bcrypt = require('bcrypt');

      const users = [];
      const errors = [];

      // Process CSV file
      const filePath = path.join(__dirname, '../uploads', file.name);
      await file.mv(filePath);

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            // Validate required fields
            if (!row.name || !row.email || !row.role) {
              errors.push(`Row ${users.length + 1}: Missing required fields (name, email, role)`);
              return;
            }

            users.push({
              name: row.name.trim(),
              email: row.email.trim().toLowerCase(),
              role: row.role.trim().toLowerCase(),
              department_id: row.department_id ? parseInt(row.department_id) : null,
              student_id: row.student_id ? row.student_id.trim() : null,
              employee_id: row.employee_id ? row.employee_id.trim() : null
            });
          })
          .on('end', async () => {
            try {
              let successCount = 0;
              const bcrypt = require('bcrypt');
              const defaultPassword = 'password123';

              for (const user of users) {
                try {
                  const passwordHash = await bcrypt.hash(defaultPassword, 10);

                  await db.execute(`
                    INSERT INTO users (
                      name, email, password_hash, role, department_id,
                      student_id, employee_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                  `, [
                    user.name,
                    user.email,
                    passwordHash,
                    user.role,
                    user.department_id,
                    user.student_id,
                    user.employee_id
                  ]);

                  successCount++;
                } catch (err) {
                  errors.push(`Failed to create user ${user.email}: ${err.message}`);
                }
              }

              // Clean up uploaded file
              fs.unlinkSync(filePath);

              // Log bulk upload action
              await db.execute(`
                INSERT INTO audit_logs (
                  user_id, actor_role, action, resource_type, resource_id,
                  old_value, new_value, status, severity
                ) VALUES (?, 'admin', 'bulk_create', 'user', NULL, NULL, ?, 'success', 'info')
              `, [adminId, JSON.stringify({ uploaded: users.length, successful: successCount, errors: errors.length })]);

              resolve({
                success: true,
                message: `Bulk upload completed. ${successCount} users created, ${errors.length} errors.`,
                data: {
                  uploaded: users.length,
                  successful: successCount,
                  errors
                }
              });

            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            reject(error);
          });
      });

    } catch (error) {
      logger.error('Error bulk uploading users:', error);
      throw error;
    }
  }

  /**
   * Bulk upload departments from CSV file
   */
  async bulkUploadDepartments(file, adminId) {
    try {
      const csv = require('csv-parser');
      const fs = require('fs');
      const path = require('path');

      const departments = [];
      const errors = [];

      // Process CSV file
      const filePath = path.join(__dirname, '../uploads', file.name);
      await file.mv(filePath);

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            // Validate required fields
            if (!row.name || !row.code) {
              errors.push(`Row ${departments.length + 1}: Missing required fields (name, code)`);
              return;
            }

            departments.push({
              name: row.name.trim(),
              code: row.code.trim().toUpperCase(),
              description: row.description ? row.description.trim() : '',
              hod_id: row.hod_id ? parseInt(row.hod_id) : null,
              deputy_hod_id: row.deputy_hod_id ? parseInt(row.deputy_hod_id) : null
            });
          })
          .on('end', async () => {
            try {
              let successCount = 0;

              for (const dept of departments) {
                try {
                  await db.execute(`
                    INSERT INTO departments (
                      name, code, description, hod_id, deputy_hod_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                  `, [
                    dept.name,
                    dept.code,
                    dept.description,
                    dept.hod_id,
                    dept.deputy_hod_id
                  ]);

                  successCount++;
                } catch (err) {
                  errors.push(`Failed to create department ${dept.name}: ${err.message}`);
                }
              }

              // Clean up uploaded file
              fs.unlinkSync(filePath);

              // Log bulk upload action
              await db.execute(`
                INSERT INTO audit_logs (
                  user_id, actor_role, action, resource_type, resource_id,
                  old_value, new_value, status, severity
                ) VALUES (?, 'admin', 'bulk_create', 'department', NULL, NULL, ?, 'success', 'info')
              `, [adminId, JSON.stringify({ uploaded: departments.length, successful: successCount, errors: errors.length })]);

              resolve({
                success: true,
                message: `Bulk upload completed. ${successCount} departments created, ${errors.length} errors.`,
                data: {
                  uploaded: departments.length,
                  successful: successCount,
                  errors
                }
              });

            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            reject(error);
          });
      });

    } catch (error) {
      logger.error('Error bulk uploading departments:', error);
      throw error;
    }
  }

  /**
   * Get attendance records with pagination and filtering for admin
   */
  async getAttendanceRecords(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];

      // Build WHERE conditions
      if (filters.class_id) {
        whereConditions.push('c.id = ?');
        params.push(filters.class_id);
      }

      if (filters.date) {
        whereConditions.push('DATE(al.timestamp) = ?');
        params.push(filters.date);
      }

      if (filters.status && filters.status !== 'all') {
        whereConditions.push('al.status = ?');
        params.push(filters.status);
      }

      if (filters.search) {
        whereConditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const [countResult] = await db.execute(`
        SELECT COUNT(*) as total
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN students s ON al.student_id = s.id
        ${whereClause}
      `, params);

      const total = countResult[0]?.total || 0;

      // Get records with pagination
      const [records] = await db.execute(`
        SELECT
          al.id,
          al.student_id,
          al.session_id,
          al.status,
          al.timestamp,
          al.verified_by,
          al.verified_at,
          s.first_name,
          s.last_name,
          s.student_id as student_number,
          c.class_name,
          c.id as class_id,
          cs.session_date,
          cs.start_time,
          cs.end_time,
          d.name as department_name,
          l.first_name as lecturer_first_name,
          l.last_name as lecturer_last_name
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN students s ON al.student_id = s.id
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN lecturers l ON cs.lecturer_id = l.id
        ${whereClause}
        ORDER BY al.timestamp DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Get stats
      const [statsResult] = await db.execute(`
        SELECT
          COUNT(*) as total_records,
          SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN al.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN al.status = 'late' THEN 1 ELSE 0 END) as late_count,
          ROUND(
            (SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
          ) as attendance_rate
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN students s ON al.student_id = s.id
        ${whereClause}
      `, params);

      const stats = statsResult[0] || {
        total_records: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        attendance_rate: 0
      };

      return {
        success: true,
        data: {
          records: records || [],
          total,
          stats: {
            totalRecords: stats.total_records || 0,
            presentCount: stats.present_count || 0,
            absentCount: stats.absent_count || 0,
            lateCount: stats.late_count || 0,
            attendanceRate: stats.attendance_rate || 0
          }
        }
      };

    } catch (error) {
      logger.error('Error getting attendance records:', error);
      throw error;
    }
  }

  /**
   * Export attendance records as CSV
   */
  async exportAttendanceRecords(filters = {}) {
    try {
      let whereConditions = [];
      let params = [];

      // Build WHERE conditions
      if (filters.class_id) {
        whereConditions.push('c.id = ?');
        params.push(filters.class_id);
      }

      if (filters.date) {
        whereConditions.push('DATE(al.timestamp) = ?');
        params.push(filters.date);
      }

      if (filters.status && filters.status !== 'all') {
        whereConditions.push('al.status = ?');
        params.push(filters.status);
      }

      if (filters.search) {
        whereConditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get all records for export
      const [records] = await db.execute(`
        SELECT
          al.id,
          s.student_id as student_number,
          CONCAT(s.first_name, ' ', s.last_name) as student_name,
          c.class_name,
          d.name as department_name,
          DATE(cs.session_date) as session_date,
          TIME(cs.start_time) as start_time,
          TIME(cs.end_time) as end_time,
          al.status,
          al.timestamp as marked_at,
          CASE WHEN al.verified_by IS NOT NULL THEN 'Verified' ELSE 'Unverified' END as verification_status,
          CONCAT(l.first_name, ' ', l.last_name) as lecturer_name
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN students s ON al.student_id = s.id
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN lecturers l ON cs.lecturer_id = l.id
        ${whereClause}
        ORDER BY al.timestamp DESC
      `, params);

      // Create CSV content
      const csvHeaders = [
        'ID',
        'Student ID',
        'Student Name',
        'Class',
        'Department',
        'Session Date',
        'Start Time',
        'End Time',
        'Status',
        'Marked At',
        'Verification Status',
        'Lecturer'
      ];

      const csvRows = records.map(record => [
        record.id,
        record.student_number,
        record.student_name,
        record.class_name,
        record.department_name || '',
        record.session_date,
        record.start_time,
        record.end_time,
        record.status,
        record.marked_at,
        record.verification_status,
        record.lecturer_name || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return {
        success: true,
        data: csvContent,
        filename: `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
      };

    } catch (error) {
      logger.error('Error exporting attendance records:', error);
      throw error;
    }
  }

  /**
   * Get all classes with filtering and pagination for admin
   */
  async getAllClasses(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.search) {
        whereClause += ' AND (c.class_name LIKE ? OR c.course_code LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.department_id) {
        whereClause += ' AND c.department_id = ?';
        params.push(filters.department_id);
      }

      if (filters.lecturer_id) {
        whereClause += ' AND c.lecturer_id = ?';
        params.push(filters.lecturer_id);
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const [classes] = await db.execute(`
        SELECT
          c.id,
          c.class_name,
          c.course_code,
          c.department_id,
          d.name as department_name,
          c.lecturer_id,
          CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
          c.schedule,
          c.capacity,
          c.description,
          c.room,
          c.semester,
          c.academic_year,
          c.created_at,
          c.updated_at
        FROM classes c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN lecturers l ON c.lecturer_id = l.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const [totalCount] = await db.execute(`
        SELECT COUNT(*) as total
        FROM classes c
        ${whereClause}
      `, params);

      return {
        success: true,
        data: {
          classes: classes || [],
          total: totalCount[0]?.total || 0,
          limit,
          offset
        }
      };

    } catch (error) {
      logger.error('Error getting all classes:', error);
      throw error;
    }
  }

  /**
   * Create new class
   */
  async createClass(classData, adminId) {
    try {
      const { class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year } = classData;

      const [result] = await db.execute(`
        INSERT INTO classes (
          class_name, course_code, department_id, lecturer_id,
          schedule, capacity, description, room, semester, academic_year,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year]);

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'create', 'class', ?, NULL, ?, 'success', 'info')
      `, [adminId, result.insertId, JSON.stringify({ class_name, course_code, department_id })]);

      return {
        success: true,
        message: 'Class created successfully',
        data: { classId: result.insertId }
      };

    } catch (error) {
      logger.error('Error creating class:', error);
      throw error;
    }
  }

  /**
   * Update class
   */
  async updateClass(classId, classData, adminId) {
    try {
      const { class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year } = classData;

      // Get current class data for audit
      const [currentClass] = await db.execute(
        'SELECT class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year FROM classes WHERE id = ?',
        [classId]
      );

      if (currentClass.length === 0) {
        throw new Error('Class not found');
      }

      const oldValue = JSON.stringify(currentClass[0]);

      await db.execute(`
        UPDATE classes SET
          class_name = ?, course_code = ?, department_id = ?, lecturer_id = ?,
          schedule = ?, capacity = ?, description = ?, room = ?, semester = ?, academic_year = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year, classId]);

      const newValue = JSON.stringify({ class_name, course_code, department_id, lecturer_id, schedule, capacity, description, room, semester, academic_year });

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'update', 'class', ?, ?, ?, 'success', 'info')
      `, [adminId, classId, oldValue, newValue]);

      return {
        success: true,
        message: 'Class updated successfully'
      };

    } catch (error) {
      logger.error('Error updating class:', error);
      throw error;
    }
  }

  /**
   * Delete class
   */
  async deleteClass(classId, adminId) {
    try {
      // Get class data for audit before deletion
      const [classData] = await db.execute(
        'SELECT class_name, course_code FROM classes WHERE id = ?',
        [classId]
      );

      if (classData.length === 0) {
        throw new Error('Class not found');
      }

      await db.execute('DELETE FROM classes WHERE id = ?', [classId]);

      // Log the action
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, actor_role, action, resource_type, resource_id,
          old_value, new_value, status, severity
        ) VALUES (?, 'admin', 'delete', 'class', ?, ?, NULL, 'success', 'warning')
      `, [adminId, classId, JSON.stringify(classData[0])]);

      return {
        success: true,
        message: 'Class deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting class:', error);
      throw error;
    }
  }

  /**
   * Get attendance trends for reports
   */
  async getAttendanceTrendsForReports(days = 30) {
    try {
      const [trends] = await db.execute(`
        SELECT
          DATE(al.timestamp) as date,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as present,
          COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN al.student_id END) as absent,
          COUNT(DISTINCT CASE WHEN al.status = 'late' THEN al.student_id END) as late,
          COUNT(DISTINCT al.student_id) as total_students,
          ROUND(
            (COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / COUNT(DISTINCT al.student_id)) * 100, 2
          ) as attendance_rate
        FROM attendance_logs al
        WHERE al.timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(al.timestamp)
        ORDER BY date DESC
        LIMIT 30
      `, [days]);

      return {
        success: true,
        data: trends || []
      };

    } catch (error) {
      logger.error('Error getting attendance trends for reports:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive reports data
   */
  async getReportsData(filters = {}) {
    try {
      const { startDate, endDate, department_id, class_id } = filters;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (startDate && endDate) {
        whereClause += ' AND DATE(al.timestamp) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      if (department_id) {
        whereClause += ' AND c.department_id = ?';
        params.push(department_id);
      }

      if (class_id) {
        whereClause += ' AND c.id = ?';
        params.push(class_id);
      }

      // Overall statistics
      const [overallStats] = await db.execute(`
        SELECT
          COUNT(DISTINCT al.id) as total_records,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as unique_present_students,
          COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN al.student_id END) as unique_absent_students,
          COUNT(DISTINCT al.student_id) as total_unique_students,
          ROUND(
            (COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / COUNT(DISTINCT al.student_id)) * 100, 2
          ) as overall_attendance_rate
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        ${whereClause.replace('al.timestamp', 'cs.session_date')}
      `, params);

      // Department-wise breakdown
      const [departmentStats] = await db.execute(`
        SELECT
          d.name as department_name,
          COUNT(DISTINCT al.id) as records,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as present_students,
          COUNT(DISTINCT al.student_id) as total_students,
          ROUND(
            (COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / COUNT(DISTINCT al.student_id)) * 100, 2
          ) as attendance_rate
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN departments d ON c.department_id = d.id
        ${whereClause.replace('al.timestamp', 'cs.session_date')}
        GROUP BY d.id, d.name
        ORDER BY attendance_rate DESC
      `, params);

      // Class-wise breakdown
      const [classStats] = await db.execute(`
        SELECT
          c.class_name,
          d.name as department_name,
          COUNT(DISTINCT al.id) as records,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as present_students,
          COUNT(DISTINCT al.student_id) as total_students,
          ROUND(
            (COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / COUNT(DISTINCT al.student_id)) * 100, 2
          ) as attendance_rate
        FROM attendance_logs al
        JOIN class_sessions cs ON al.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN departments d ON c.department_id = d.id
        ${whereClause.replace('al.timestamp', 'cs.session_date')}
        GROUP BY c.id, c.class_name, d.name
        ORDER BY attendance_rate DESC
      `, params);

      return {
        success: true,
        data: {
          overall: overallStats[0] || {},
          departments: departmentStats || [],
          classes: classStats || []
        }
      };

    } catch (error) {
      logger.error('Error getting reports data:', error);
      throw error;
    }
  }

  /**
   * Export reports as PDF or Excel
   */
  async exportReports(filters = {}, format = 'pdf') {
    try {
      const reportsData = await this.getReportsData(filters);

      if (!reportsData.success) {
        throw new Error('Failed to generate reports data');
      }

      // For now, return JSON data - in production, generate actual PDF/Excel
      const exportData = {
        generated_at: new Date().toISOString(),
        filters,
        data: reportsData.data
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2),
        filename: `attendance_report_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'json' : 'json'}`
      };

    } catch (error) {
      logger.error('Error exporting reports:', error);
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
      await db.execute(query, [
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
  async getConversations(adminId) {
    try {
      const [conversations] = await db.execute(`
        SELECT
          am.student_id as participant_id,
          u.name as participant_name,
          u.role as participant_role,
          'active' as status,
          MAX(am.created_at) as updated_at,
          (
            SELECT message
            FROM admin_messages
            WHERE student_id = am.student_id
            ORDER BY created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT DATE_FORMAT(created_at, '%H:%i')
            FROM admin_messages
            WHERE student_id = am.student_id
            ORDER BY created_at DESC
            LIMIT 1
          ) as last_message_time,
          (
            SELECT COUNT(*)
            FROM admin_messages
            WHERE student_id = am.student_id
            AND sender_type = 'student'
            AND is_read = 0
          ) as unread_count
        FROM admin_messages am
        JOIN users u ON am.student_id = u.id
        GROUP BY am.student_id, u.name, u.role
        ORDER BY updated_at DESC
      `);

      return conversations;
    } catch (error) {
      logger.error('Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  /**
   * Get messages for a specific conversation (adapted for admin_messages table)
   */
  async getConversationMessages(participantId, adminId) {
    try {
      // Get messages for this participant
      const [messages] = await db.execute(`
        SELECT
          am.id,
          am.message as content,
          am.sender_type,
          CASE
            WHEN am.sender_type = 'admin' THEN ?
            ELSE am.student_id
          END as sender_id,
          am.is_read,
          DATE_FORMAT(am.created_at, '%Y-%m-%d %H:%i:%s') as timestamp,
          am.created_at
        FROM admin_messages am
        WHERE am.student_id = ?
        ORDER BY am.created_at ASC
      `, [adminId, participantId]);

      // Mark messages as read if they were sent by participant
      await db.execute(`
        UPDATE admin_messages
        SET is_read = 1
        WHERE student_id = ?
        AND sender_type = 'student'
        AND is_read = 0
      `, [participantId]);

      return messages;
    } catch (error) {
      logger.error('Error fetching conversation messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  /**
   * Send a message in a conversation (adapted for admin_messages table)
   */
  async sendMessage(adminId, participantId, message) {
    try {
      // Insert message
      const [result] = await db.execute(`
        INSERT INTO admin_messages (student_id, sender_id, sender_type, message, is_read, created_at)
        VALUES (?, ?, 'admin', ?, 1, NOW())
      `, [participantId, adminId.toString(), message]);

      // Log audit
      await this.logAdminAudit({
        user_id: adminId,
        actor_role: 'admin',
        action: 'send_message',
        resource_type: 'admin_message',
        resource_id: result.insertId,
        resource_name: `Message to student ${participantId}`,
        new_value: { message_length: message.length },
        status: 'success',
        severity: 'low'
      });

      return { messageId: result.insertId };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Create a new conversation with a participant (adapted for admin_messages table)
   */
  async createConversation(adminId, participantId, initialMessage = null) {
    try {
      // Check if conversation already exists (has messages)
      const [existing] = await db.execute(`
        SELECT COUNT(*) as message_count
        FROM admin_messages
        WHERE student_id = ?
      `, [participantId]);

      if (existing[0].message_count > 0) {
        throw new Error('Conversation already exists with this participant');
      }

      let messageId = null;
      if (initialMessage) {
        const result = await this.sendMessage(adminId, participantId, initialMessage);
        messageId = result.messageId;
      }

      return { conversationId: participantId, messageId };
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Get admin profile statistics
   */
  async getAdminProfileStats(adminId) {
    try {
      // Get admin's activity stats
      const [activityStats] = await db.execute(`
        SELECT
          COUNT(*) as total_actions,
          MAX(created_at) as last_activity
        FROM audit_logs
        WHERE user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [adminId]);

      // Get system overview stats
      const [systemStats] = await db.execute(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM classes) as total_classes,
          (SELECT COUNT(*) FROM attendance_logs) as total_attendance_records,
          (SELECT COUNT(*) FROM admin_messages WHERE sender_type = 'admin' AND sender_id = ?) as messages_sent
        FROM dual
      `, [adminId.toString()]);

      // Get recent login info
      const [loginInfo] = await db.execute(`
        SELECT
          MAX(created_at) as last_login,
          COUNT(*) as total_logins
        FROM audit_logs
        WHERE user_id = ?
        AND action = 'login'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [adminId]);

      return {
        totalUsers: systemStats[0].total_users,
        totalClasses: systemStats[0].total_classes,
        totalAttendanceRecords: systemStats[0].total_attendance_records,
        messagesSent: systemStats[0].messages_sent,
        totalActions: activityStats[0].total_actions,
        lastActivity: activityStats[0].last_activity,
        lastLogin: loginInfo[0].last_login,
        totalLogins: loginInfo[0].total_logins,
        systemUptime: '99.9%' // This could be calculated from system monitoring
      };
    } catch (error) {
      logger.error('Error fetching admin profile stats:', error);
      throw new Error('Failed to fetch profile stats');
    }
  }

  /**
   * Get system settings (returns default settings since no system_settings table exists)
   */
  async getSystemSettings() {
    try {
      // Return default system settings
      return {
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          attendanceAlerts: true,
          systemAlerts: true,
          userActivityAlerts: false,
          weeklyReports: true
        },
        privacy: {
          profileVisibility: 'admin',
          dataRetention: 365,
          auditLogging: true,
          ipLogging: false
        },
        system: {
          maintenanceMode: false,
          autoBackup: true,
          backupFrequency: 'daily',
          sessionTimeout: 480, // minutes
          maxLoginAttempts: 5
        },
        communication: {
          defaultLanguage: 'en',
          timezone: 'UTC',
          dateFormat: 'DD/MM/YYYY',
          emailFromAddress: 'admin@university.edu'
        }
      };
    } catch (error) {
      logger.error('Error fetching system settings:', error);
      throw new Error('Failed to fetch system settings');
    }
  }

  /**
   * Update system settings (logs the action but doesn't persist since no table exists)
   */
  async updateSystemSettings(adminId, settings) {
    try {
      // Log the settings update action
      await this.logAdminAudit({
        user_id: adminId,
        actor_role: 'admin',
        action: 'update_system_settings',
        resource_type: 'system_config',
        resource_id: 'system_settings',
        resource_name: 'System Settings',
        new_value: settings,
        status: 'success',
        severity: 'high'
      });

      // For now, just return success since we don't have a system_settings table
      // In a real implementation, this would update a system_settings table
      return { updated: true };
    } catch (error) {
      logger.error('Error updating system settings:', error);
      throw new Error('Failed to update system settings');
    }
  }

  /**
   * Get all support tickets
   */
  async getSupportTickets() {
    try {
      const [tickets] = await db.execute(`
        SELECT
          st.id,
          st.subject,
          st.description,
          st.status,
          st.priority,
          st.created_at,
          st.updated_at,
          st.resolved_at,
          u.name as student_name,
          u.email as student_email,
          admin_u.name as assigned_admin_name,
          (
            SELECT COUNT(*) FROM support_responses sr WHERE sr.ticket_id = st.id
          ) as response_count
        FROM support_tickets st
        JOIN users u ON st.student_id = u.id
        LEFT JOIN users admin_u ON st.assigned_admin_id = admin_u.id
        ORDER BY st.created_at DESC
      `);

      return tickets;
    } catch (error) {
      logger.error('Error fetching support tickets:', error);
      throw new Error('Failed to fetch support tickets');
    }
  }

  /**
   * Get support FAQs (returns static FAQs since no FAQ table exists)
   */
  async getSupportFAQs() {
    try {
      // Return static FAQs since there's no FAQ table in the schema
      return [
        {
          id: 1,
          question: 'How do I check my attendance?',
          answer: 'You can check your attendance in the Attendance section of your dashboard. It shows your attendance percentage and history for each class.',
          category: 'attendance'
        },
        {
          id: 2,
          question: 'What should I do if I forgot my password?',
          answer: 'Click on the "Forgot Password" link on the login page. Enter your email address and follow the instructions sent to your email.',
          category: 'account'
        },
        {
          id: 3,
          question: 'How do I scan QR codes for attendance?',
          answer: 'Open the Attendance section, select your class, and click on "Scan QR Code". Point your camera at the QR code displayed by your lecturer.',
          category: 'attendance'
        },
        {
          id: 4,
          question: 'Can I view my grades?',
          answer: 'Grades are not currently available in the system. Please contact your lecturer or department for grade information.',
          category: 'academic'
        },
        {
          id: 5,
          question: 'How do I contact my lecturer?',
          answer: 'You can use the Messages section to send messages to your lecturers. Select the lecturer from your class list.',
          category: 'communication'
        }
      ];
    } catch (error) {
      logger.error('Error fetching support FAQs:', error);
      throw new Error('Failed to fetch FAQs');
    }
  }

  /**
   * Create a new support ticket
   */
  async createSupportTicket(adminId, ticketData) {
    try {
      const [result] = await db.execute(`
        INSERT INTO support_tickets (
          student_id, subject, description, status, priority, assigned_admin_id, created_at, updated_at
        ) VALUES (?, ?, ?, 'open', ?, ?, NOW(), NOW())
      `, [
        ticketData.student_id,
        ticketData.subject,
        ticketData.description,
        ticketData.priority || 'medium',
        adminId
      ]);

      // Log audit
      await this.logAdminAudit({
        user_id: adminId,
        actor_role: 'admin',
        action: 'create_support_ticket',
        resource_type: 'support_ticket',
        resource_id: result.insertId,
        resource_name: ticketData.subject,
        status: 'success',
        severity: 'low'
      });

      return { ticketId: result.insertId };
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  /**
   * Reply to a support ticket
   */
  async replyToSupportTicket(adminId, ticketId, response) {
    try {
      // Add response to support_responses table
      const [result] = await db.execute(`
        INSERT INTO support_responses (ticket_id, responder_id, response_text, created_at)
        VALUES (?, ?, ?, NOW())
      `, [ticketId, adminId, response]);

      // Update ticket updated_at
      await db.execute(`
        UPDATE support_tickets
        SET updated_at = NOW()
        WHERE id = ?
      `, [ticketId]);

      // Log audit
      await this.logAdminAudit({
        user_id: adminId,
        actor_role: 'admin',
        action: 'reply_support_ticket',
        resource_type: 'support_ticket',
        resource_id: ticketId,
        resource_name: `Reply to ticket ${ticketId}`,
        new_value: { response_length: response.length },
        status: 'success',
        severity: 'low'
      });

      return { responseId: result.insertId };
    } catch (error) {
      logger.error('Error replying to support ticket:', error);
      throw new Error('Failed to send reply');
    }
  }

  /**
   * Update support ticket status
   */
  async updateSupportTicketStatus(adminId, ticketId, status) {
    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date();
      }

      await db.execute(`
        UPDATE support_tickets
        SET status = ?, updated_at = ?, resolved_at = ?
        WHERE id = ?
      `, [status, updateData.updated_at, updateData.resolved_at || null, ticketId]);

      // Log audit
      await this.logAdminAudit({
        user_id: adminId,
        actor_role: 'admin',
        action: 'update_support_ticket_status',
        resource_type: 'support_ticket',
        resource_id: ticketId,
        resource_name: `Ticket ${ticketId} status update`,
        old_value: { status: 'previous_status' }, // Would need to fetch previous status
        new_value: { status },
        status: 'success',
        severity: 'low'
      });

      return { updated: true };
    } catch (error) {
      logger.error('Error updating support ticket status:', error);
      throw new Error('Failed to update ticket status');
    }
  }
}

module.exports = new AdminService();
