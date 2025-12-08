const pool = require('../config/database');

/**
 * Notification Service
 * Manages real-time notifications for students, lecturers, and admins
 */

class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(userId, title, message, type, classId = null) {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, related_class_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, title, message, type, is_read, created_at
    `;

    const result = await pool.query(query, [userId, title, message, type, classId]);
    return result.rows[0];
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId) {
    const query = `
      SELECT id, title, message, type, related_class_id, created_at
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get all notifications for a user with pagination
   */
  static async getNotifications(userId, limit = 20, offset = 0) {
    const query = `
      SELECT id, title, message, type, related_class_id, is_read, created_at, read_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, is_read, read_at
    `;

    const result = await pool.query(query, [notificationId]);
    return result.rows[0];
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING id
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * Broadcast notification to multiple users (e.g., all students in a class)
   */
  static async broadcastNotification(userIds, title, message, type, classId = null) {
    const notifications = [];

    for (const userId of userIds) {
      const notification = await this.createNotification(userId, title, message, type, classId);
      notifications.push(notification);
    }

    return notifications;
  }
}

module.exports = NotificationService;
