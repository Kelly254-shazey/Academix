// broadcastService.js
// Broadcast system: announcements, delivery tracking, Socket.IO integration
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class BroadcastService {
  /**
   * Create broadcast announcement
   */
  async createBroadcast(data, createdBy) {
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
        INSERT INTO broadcasts (
          title, message, content_type, target_type,
          target_roles, target_departments, target_users,
          priority, scheduled_at, expires_at, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [
        data.title,
        data.message,
        data.content_type || 'text',
        data.target_type,
        JSON.stringify(data.target_roles || []),
        JSON.stringify(data.target_departments || []),
        JSON.stringify(data.target_users || []),
        data.priority || 'normal',
        data.scheduled_at,
        data.expires_at,
        createdBy,
      ]);

      conn.end();

      logger.info(`Broadcast ${result.insertId} created with priority ${data.priority}`);

      return {
        success: true,
        data: {
          broadcastId: result.insertId,
          title: data.title,
          targetType: data.target_type,
          priority: data.priority,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in createBroadcast:', error);
      throw error;
    }
  }

  /**
   * Get broadcast details with delivery stats
   */
  async getBroadcastDetails(broadcastId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [broadcast] = await conn.query(`
        SELECT * FROM broadcasts WHERE id = ?
      `, [broadcastId]);

      if (!broadcast || broadcast.length === 0) {
        conn.end();
        throw new Error('Broadcast not found');
      }

      // Get delivery stats
      const [stats] = await conn.query(`
        SELECT 
          COUNT(*) as total_recipients,
          COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN delivery_status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count,
          ROUND(COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) * 100.0 /
            NULLIF(COUNT(*), 0), 2) as read_percent
        FROM broadcast_delivery
        WHERE broadcast_id = ?
      `, [broadcastId]);

      conn.end();

      return {
        success: true,
        data: {
          broadcast: broadcast[0],
          delivery: stats[0],
        },
      };
    } catch (error) {
      logger.error('Error in getBroadcastDetails:', error);
      throw error;
    }
  }

  /**
   * List broadcasts with filters
   */
  async listBroadcasts(filters = {}, limit = 50, offset = 0) {
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
          b.id, b.title, b.message, b.priority, b.target_type,
          b.broadcast_at, b.expires_at, b.is_active,
          COUNT(DISTINCT bd.id) as delivery_count,
          COUNT(DISTINCT CASE WHEN bd.read_at IS NOT NULL THEN bd.id END) as read_count
        FROM broadcasts b
        LEFT JOIN broadcast_delivery bd ON b.id = bd.broadcast_id
        WHERE b.is_active = TRUE
      `;
      const params = [];

      if (filters.priority) {
        query += ` AND b.priority = ?`;
        params.push(filters.priority);
      }

      if (filters.targetType) {
        query += ` AND b.target_type = ?`;
        params.push(filters.targetType);
      }

      query += ` GROUP BY b.id ORDER BY b.broadcast_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [broadcasts] = await conn.query(query, params);
      conn.end();

      return {
        success: true,
        data: broadcasts || [],
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error in listBroadcasts:', error);
      throw error;
    }
  }

  /**
   * Record broadcast delivery
   */
  async recordDelivery(broadcastId, recipientIds, method = 'socket') {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const values = recipientIds.map(id => [
        broadcastId,
        id,
        method,
        'pending',
      ]);

      await conn.query(`
        INSERT INTO broadcast_delivery (broadcast_id, recipient_user_id, delivery_method, delivery_status)
        VALUES ? ON DUPLICATE KEY UPDATE delivery_status = 'pending'
      `, [values]);

      conn.end();

      logger.info(`Delivery recorded for ${recipientIds.length} recipients`);

      return {
        success: true,
        data: {
          broadcastId,
          recipientCount: recipientIds.length,
          method,
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in recordDelivery:', error);
      throw error;
    }
  }

  /**
   * Mark broadcast as read
   */
  async markAsRead(broadcastId, userId) {
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
        UPDATE broadcast_delivery
        SET read_at = NOW(), delivery_status = 'delivered'
        WHERE broadcast_id = ? AND recipient_user_id = ? AND read_at IS NULL
      `, [broadcastId, userId]);

      conn.end();

      return {
        success: result.affectedRows > 0,
        data: { broadcastId, userId, marked: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(broadcastId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [analytics] = await conn.query(`
        SELECT 
          delivery_method,
          delivery_status,
          COUNT(*) as count
        FROM broadcast_delivery
        WHERE broadcast_id = ?
        GROUP BY delivery_method, delivery_status
      `, [broadcastId]);

      conn.end();

      return {
        success: true,
        data: analytics || [],
        broadcastId,
      };
    } catch (error) {
      logger.error('Error in getDeliveryAnalytics:', error);
      throw error;
    }
  }
}

module.exports = new BroadcastService();
