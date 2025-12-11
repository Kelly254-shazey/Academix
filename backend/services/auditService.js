// auditService.js
// Audit log management: searching, filtering, compliance reports, exports
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Get audit logs with advanced filtering
   */
  async getAuditLogs(filters = {}, limit = 100, offset = 0) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      let query = `SELECT * FROM audit_logs WHERE 1=1`;
      const params = [];

      // Filter by user
      if (filters.user_id) {
        query += ` AND user_id = ?`;
        params.push(filters.user_id);
      }

      // Filter by action
      if (filters.action) {
        query += ` AND action = ?`;
        params.push(filters.action);
      }

      // Filter by resource
      if (filters.resource_type) {
        query += ` AND resource_type = ?`;
        params.push(filters.resource_type);
      }

      // Filter by resource ID
      if (filters.resource_id) {
        query += ` AND resource_id = ?`;
        params.push(filters.resource_id);
      }

      // Filter by severity
      if (filters.severity) {
        query += ` AND severity = ?`;
        params.push(filters.severity);
      }

      // Filter by status
      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      // Filter by date range
      if (filters.startDate) {
        query += ` AND DATE(action_timestamp) >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND DATE(action_timestamp) <= ?`;
        params.push(filters.endDate);
      }

      // Filter by IP address
      if (filters.ip_address) {
        query += ` AND ip_address = ?`;
        params.push(filters.ip_address);
      }

      // Filter by department
      if (filters.department_id) {
        query += ` AND department_id = ?`;
        params.push(filters.department_id);
      }

      // Full-text search on action/resource
      if (filters.search) {
        query += ` AND (action LIKE ? OR resource_name LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await conn.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // Apply pagination and sorting
      query += ` ORDER BY action_timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [results] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: results || [],
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAuditLogs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for specific user
   */
  async getAuditLogsByUser(userId, startDate, endDate, limit = 50) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [results] = await conn.query(`
        SELECT *
        FROM audit_logs
        WHERE user_id = ?
          AND DATE(action_timestamp) >= ?
          AND DATE(action_timestamp) <= ?
        ORDER BY action_timestamp DESC
        LIMIT ?
      `, [userId, startDate, endDate, limit]);

      conn.end();

      return {
        success: true,
        data: results || [],
        userId,
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      logger.error('Error in getAuditLogsByUser:', error);
      throw error;
    }
  }

  /**
   * Get change history for resource
   */
  async getAuditLogsByResource(resourceType, resourceId) {
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
          id, user_id, action, old_value, new_value,
          action_timestamp, status, error_message
        FROM audit_logs
        WHERE resource_type = ? AND resource_id = ?
        ORDER BY action_timestamp DESC
      `, [resourceType, resourceId]);

      conn.end();

      // Construct change history
      const history = results.map(log => ({
        timestamp: log.action_timestamp,
        action: log.action,
        userId: log.user_id,
        oldValue: log.old_value ? JSON.parse(log.old_value) : null,
        newValue: log.new_value ? JSON.parse(log.new_value) : null,
        status: log.status,
        errorMessage: log.error_message,
      }));

      return {
        success: true,
        data: history,
        resourceType,
        resourceId,
      };
    } catch (error) {
      logger.error('Error in getAuditLogsByResource:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async getComplianceReport(startDate, endDate) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Overall statistics
      const [stats] = await conn.query(`
        SELECT 
          COUNT(*) as total_actions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT DATE(action_timestamp)) as days_with_activity,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
          COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_actions,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_actions,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_actions
        FROM audit_logs
        WHERE DATE(action_timestamp) >= ? AND DATE(action_timestamp) <= ?
      `, [startDate, endDate]);

      // Actions by type
      const [actionTypes] = await conn.query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE DATE(action_timestamp) >= ? AND DATE(action_timestamp) <= ?
        GROUP BY action
        ORDER BY count DESC
      `, [startDate, endDate]);

      // Failed actions
      const [failures] = await conn.query(`
        SELECT 
          user_id, actor_role, action, resource_type,
          error_message, action_timestamp
        FROM audit_logs
        WHERE status = 'failure'
          AND DATE(action_timestamp) >= ? AND DATE(action_timestamp) <= ?
        ORDER BY action_timestamp DESC
        LIMIT 100
      `, [startDate, endDate]);

      // Privileged operations (create, delete, grant, revoke)
      const [privilegedOps] = await conn.query(`
        SELECT 
          user_id, action, resource_type, resource_name,
          action_timestamp
        FROM audit_logs
        WHERE action IN ('create', 'delete', 'grant', 'revoke', 'assign_role')
          AND DATE(action_timestamp) >= ? AND DATE(action_timestamp) <= ?
        ORDER BY action_timestamp DESC
      `, [startDate, endDate]);

      conn.end();

      return {
        success: true,
        data: {
          reportDate: new Date(),
          dateRange: { startDate, endDate },
          summary: stats[0],
          actionsByType: actionTypes,
          failedActions: failures,
          privilegedOperations: privilegedOps,
        },
      };
    } catch (error) {
      logger.error('Error in getComplianceReport:', error);
      throw error;
    }
  }

  /**
   * Export audit logs as CSV/JSON
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      let query = `SELECT * FROM audit_logs WHERE 1=1`;
      const params = [];

      // Apply filters (same as getAuditLogs)
      if (filters.startDate) {
        query += ` AND DATE(action_timestamp) >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND DATE(action_timestamp) <= ?`;
        params.push(filters.endDate);
      }

      if (filters.user_id) {
        query += ` AND user_id = ?`;
        params.push(filters.user_id);
      }

      if (filters.severity) {
        query += ` AND severity = ?`;
        params.push(filters.severity);
      }

      query += ` ORDER BY action_timestamp DESC`;

      const [results] = await conn.query(query, params);
      conn.end();

      if (format === 'csv') {
        // Convert to CSV
        const csv = this._convertToCSV(results);
        return {
          success: true,
          format: 'csv',
          data: csv,
          filename: `audit_logs_${new Date().toISOString()}.csv`,
        };
      } else {
        // JSON format (default)
        return {
          success: true,
          format: 'json',
          data: results,
          filename: `audit_logs_${new Date().toISOString()}.json`,
          count: results.length,
        };
      }
    } catch (error) {
      logger.error('Error in exportAuditLogs:', error);
      throw error;
    }
  }

  /**
   * Delete old audit logs (retention policy)
   */
  async deleteOldLogs(olderThanDays) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const [result] = await conn.query(`
        DELETE FROM audit_logs
        WHERE action_timestamp < ?
      `, [cutoffDate]);

      conn.end();

      logger.info(`Deleted ${result.affectedRows} audit logs older than ${olderThanDays} days`);

      return {
        success: true,
        data: {
          deletedCount: result.affectedRows,
          cutoffDate,
          olderThanDays,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in deleteOldLogs:', error);
      throw error;
    }
  }

  /**
   * Helper: Convert data to CSV format
   */
  _convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item =>
      Object.values(item).map(val => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

module.exports = new AuditService();
