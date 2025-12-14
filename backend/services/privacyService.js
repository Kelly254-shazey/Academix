// privacyService.js
// GDPR compliance: data export, secure deletion, consent management
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class PrivacyService {
  /**
   * Create data export request
   */
  async createDataExportRequest(userId, requestType) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30-day expiry

      const [result] = await db.execute(`
        INSERT INTO privacy_requests (
          user_id, request_type, status, expiry_date
        ) VALUES (?, ?, 'processing', ?)
      `, [userId, requestType, expiryDate]);

      logger.info(`Privacy request ${result.insertId} created for user ${userId}`);

      return {
        success: true,
        data: {
          requestId: result.insertId,
          userId,
          requestType,
          status: 'processing',
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in createDataExportRequest:', error);
      throw error;
    }
  }

  /**
   * Get user's personal data (GDPR)
   */
  async getUserPersonalData(userId) {
    try {

      // User profile
      const [user] = await db.execute(`
        SELECT id, name, email, phone, role, created_at
        FROM users WHERE id = ?
      `, [userId]);

      // User attendance records
      const [attendance] = await db.execute(`
        SELECT s.id, s.session_date, c.name as class_name, al.status
        FROM attendance_logs al
        INNER JOIN sessions s ON al.session_id = s.id
        INNER JOIN classes c ON s.class_id = c.id
        WHERE al.student_id = ? OR al.marked_by = ?
        ORDER BY s.session_date DESC
      `, [userId, userId]);

      // User flags
      const [flags] = await db.execute(`
        SELECT id, flag_type, severity, description, flagged_at
        FROM student_flags
        WHERE student_id = ? AND status = 'active'
      `, [userId]);

      // User audit logs
      const [auditLogs] = await db.execute(`
        SELECT id, action, resource_type, action_timestamp, ip_address
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY action_timestamp DESC
        LIMIT 100
      `, [userId]);

      // Broadcast history
      const [broadcasts] = await db.execute(`
        SELECT b.id, b.title, b.priority, bd.delivered_at, bd.read_at
        FROM broadcast_delivery bd
        INNER JOIN broadcasts b ON bd.broadcast_id = b.id
        WHERE bd.recipient_user_id = ?
        ORDER BY bd.delivered_at DESC
      `, [userId]);

      return {
        success: true,
        data: {
          userProfile: user[0],
          attendance,
          flags,
          auditLogs,
          broadcasts,
        },
        userId,
        exportedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error in getUserPersonalData:', error);
      throw error;
    }
  }

  /**
   * Request secure data deletion
   */
  async requestDataDeletion(userId, reason) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Create deletion request
      const [result] = await db.execute(`
        INSERT INTO privacy_requests (
          user_id, request_type, status
        ) VALUES (?, 'data_deletion', 'pending')
      `, [userId]);

      // Log the request
      await db.execute(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id,
          description, status, severity
        ) VALUES (?, 'data_deletion_requested', 'user', ?, ?, 'success', 'high')
      `, [userId, userId, reason]);

      logger.warn(`Data deletion requested for user ${userId}: ${reason}`);

      return {
        success: true,
        data: {
          requestId: result.insertId,
          userId,
          requestType: 'data_deletion',
          status: 'pending',
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in requestDataDeletion:', error);
      throw error;
    }
  }

  /**
   * Execute data deletion (admin only)
   */
  async executeDataDeletion(userId, approvedBy) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Delete personal data while keeping audit trail
      const tables = [
        { table: 'attendance_logs', whereClause: 'student_id = ?' },
        { table: 'broadcast_delivery', whereClause: 'recipient_user_id = ?' },
        { table: 'student_flags', whereClause: 'student_id = ?' },
        { table: 'privacy_requests', whereClause: 'user_id = ?' },
        { table: 'export_jobs', whereClause: 'requested_by = ?' },
      ];

      for (const { table, whereClause } of tables) {
        await db.execute(`DELETE FROM ${table} WHERE ${whereClause}`, [userId]);
      }

      // Anonymize user
      await db.execute(`
        UPDATE users
        SET name = 'DELETED_USER', email = CONCAT('deleted_', id, '@deleted.local'),
            phone = NULL, is_active = FALSE
        WHERE id = ?
      `, [userId]);

      // Log deletion
      await db.execute(`
        INSERT INTO audit_logs (
          action, resource_type, resource_id, user_id,
          description, status, severity
        ) VALUES ('data_deleted', 'user', ?, ?, ?, 'success', 'critical')
      `, [userId, approvedBy, `Data deletion approved by admin ${approvedBy}`]);

      logger.warn(`User ${userId} data deleted by admin ${approvedBy}`);

      return {
        success: true,
        data: {
          userId,
          deleted: true,
          deletedAt: new Date(),
          approvedBy,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in executeDataDeletion:', error);
      throw error;
    }
  }

  /**
   * Get privacy requests (admin)
   */
  async getPrivacyRequests(status = 'pending', limit = 50) {
    try {

      const [requests] = await db.execute(`
        SELECT 
          pr.id, pr.user_id, u.name, u.email,
          pr.request_type, pr.status,
          pr.requested_at, pr.processed_at,
          pr.expiry_date
        FROM privacy_requests pr
        INNER JOIN users u ON pr.user_id = u.id
        WHERE pr.status = ?
        ORDER BY pr.requested_at ASC
        LIMIT ?
      `, [status, limit]);

      return {
        success: true,
        data: requests || [],
        count: requests ? requests.length : 0,
      };
    } catch (error) {
      logger.error('Error in getPrivacyRequests:', error);
      throw error;
    }
  }

  /**
   * Approve privacy request
   */
  async approvePrivacyRequest(requestId, approvedBy) {
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
        UPDATE privacy_requests
        SET status = 'completed', processed_by = ?, processed_at = NOW()
        WHERE id = ? AND status = 'pending'
      `, [approvedBy, requestId]);

      return {
        success: result.affectedRows > 0,
        data: {
          requestId,
          approved: result.affectedRows > 0,
          approvedBy,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in approvePrivacyRequest:', error);
      throw error;
    }
  }

  /**
   * Deny privacy request
   */
  async denyPrivacyRequest(requestId, reason, deniedBy) {
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
        UPDATE privacy_requests
        SET status = 'denied', denial_reason = ?, processed_by = ?, processed_at = NOW()
        WHERE id = ? AND status = 'pending'
      `, [reason, deniedBy, requestId]);

      return {
        success: result.affectedRows > 0,
        data: {
          requestId,
          denied: result.affectedRows > 0,
          reason,
          deniedBy,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in denyPrivacyRequest:', error);
      throw error;
    }
  }

  /**
   * Get consent audit trail
   */
  async getConsentAudit(userId) {
    try {

      const [consents] = await db.execute(`
        SELECT 
          id, user_id, action, resource_type,
          action_timestamp, ip_address, device_id
        FROM audit_logs
        WHERE user_id = ? AND action IN ('consent_given', 'consent_withdrawn', 'data_accessed')
        ORDER BY action_timestamp DESC
      `, [userId]);

      return {
        success: true,
        data: consents || [],
        userId,
      };
    } catch (error) {
      logger.error('Error in getConsentAudit:', error);
      throw error;
    }
  }
}

module.exports = new PrivacyService();
