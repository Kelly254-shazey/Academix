const db = require('../database');
const logger = require('../utils/logger');

const notificationService = {
  // Create a notification
  async createNotification(userId, type, title, message, relatedData = null) {
    try {
      const [result] = await db.execute(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, ?, ?, ?)`,
        [userId, type, title, message]
      );

      const notificationId = result.insertId;

      // Emit real-time notification via Socket.IO if available
      if (global.io) {
        global.io.to(`user_${userId}`).emit('new_notification', {
          id: notificationId,
          type,
          title,
          message,
          createdAt: new Date(),
          relatedData: relatedData || null,
        });
      }

      return {
        success: true,
        notificationId,
      };
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a user
  async getNotifications(userId, limit = 20, offset = 0, unreadOnly = false) {
    try {
      let query = `SELECT * FROM notifications WHERE user_id = ?`;
      const params = [userId];

      if (unreadOnly) {
        query += ` AND is_read = FALSE`;
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [results] = await db.execute(query, params);

      // Get total count
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?${unreadOnly ? ' AND is_read = FALSE' : ''}`,
        [userId]
      );

      return {
        notifications: results.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        })),
        total: countResult[0].total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark notifications as read
  async markAsRead(notificationIds, userId) {
    try {
      const placeholders = notificationIds.map(() => '?').join(',');
      
      await db.execute(
        `UPDATE notifications 
         SET is_read = TRUE, updated_at = NOW()
         WHERE id IN (${placeholders}) AND user_id = ?`,
        [...notificationIds, userId]
      );

      return {
        success: true,
        updatedCount: notificationIds.length,
      };
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      throw error;
    }
  },

  // Mark notifications as unread
  async markAsUnread(notificationIds, userId) {
    try {
      const placeholders = notificationIds.map(() => '?').join(',');
      
      await db.execute(
        `UPDATE notifications 
         SET is_read = FALSE, updated_at = NOW()
         WHERE id IN (${placeholders}) AND user_id = ?`,
        [...notificationIds, userId]
      );

      return {
        success: true,
        updatedCount: notificationIds.length,
      };
    } catch (error) {
      logger.error('Error marking notifications as unread:', error);
      throw error;
    }
  },

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      await db.execute(
        `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Clear all notifications for a user
  async clearAllNotifications(userId) {
    try {
      await db.execute(
        `DELETE FROM notifications WHERE user_id = ?`,
        [userId]
      );

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error clearing notifications:', error);
      throw error;
    }
  },

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );

      return result[0].count || 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  },

  // Broadcast notification to multiple users
  async broadcastNotification(userIds, type, title, message, relatedData = null) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        const result = await this.createNotification(userId, type, title, message, relatedData);
        results.push(result);
      }

      return {
        success: true,
        notificationsSent: results.length,
      };
    } catch (error) {
      logger.error('Error broadcasting notifications:', error);
      throw error;
    }
  },

  // Get notifications by type
  async getNotificationsByType(userId, type, limit = 20, offset = 0) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM notifications 
         WHERE user_id = ? AND type = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, type, limit, offset]
      );

      return results.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching notifications by type:', error);
      throw error;
    }
  },

  // Helper: Send class started notification
  async notifyClassStarted(classId, studentIds) {
    try {
      const [classData] = await db.execute(
        `SELECT course_name FROM classes WHERE id = ?`,
        [classId]
      );

      if (!classData.length) return;

      const title = 'Class Started';
      const message = `${classData[0].course_name} has started. Please check in.`;

      return await this.broadcastNotification(studentIds, 'class_started', title, message, { classId });
    } catch (error) {
      logger.error('Error notifying class started:', error);
      throw error;
    }
  },

  // Helper: Send low attendance warning
  async notifyLowAttendance(studentId, courseId, attendancePercent, threshold = 75) {
    try {
      const [courseData] = await db.execute(
        `SELECT course_name FROM classes WHERE id = ?`,
        [courseId]
      );

      if (!courseData.length) return;

      const title = 'Low Attendance Warning';
      const message = `Your attendance in ${courseData[0].course_name} is ${attendancePercent}%, below the ${threshold}% threshold.`;

      return await this.createNotification(studentId, 'attendance_warning', title, message, { 
        courseId, 
        attendancePercent,
        threshold 
      });
    } catch (error) {
      logger.error('Error notifying low attendance:', error);
      throw error;
    }
  },

  // Helper: Send class cancellation notification
  async notifyClassCancellation(classId, studentIds, reason = null) {
    try {
      const [classData] = await db.execute(
        `SELECT course_name FROM classes WHERE id = ?`,
        [classId]
      );

      if (!classData.length) return;

      const title = 'Class Cancelled';
      const message = `${classData[0].course_name} has been cancelled.${reason ? ' Reason: ' + reason : ''}`;

      return await this.broadcastNotification(studentIds, 'class_cancelled', title, message, { classId, reason });
    } catch (error) {
      logger.error('Error notifying class cancellation:', error);
      throw error;
    }
  },

  // Helper: Send room change notification
  async notifyRoomChange(classId, studentIds, newLocation) {
    try {
      const [classData] = await db.execute(
        `SELECT course_name FROM classes WHERE id = ?`,
        [classId]
      );

      if (!classData.length) return;

      const title = 'Classroom Changed';
      const message = `${classData[0].course_name} location has changed to ${newLocation}. Updated schedule has been sent.`;

      return await this.broadcastNotification(studentIds, 'room_changed', title, message, { classId, newLocation });
    } catch (error) {
      logger.error('Error notifying room change:', error);
      throw error;
    }
  },

  // Helper: Send lecturer delay notification
  async notifyLecturerDelay(classId, studentIds, delayMinutes) {
    try {
      const [classData] = await db.execute(
        `SELECT course_name FROM classes WHERE id = ?`,
        [classId]
      );

      if (!classData.length) return;

      const title = 'Lecturer Running Late';
      const message = `${classData[0].course_name} lecturer will be ${delayMinutes} minutes late.`;

      return await this.broadcastNotification(studentIds, 'lecturer_delay', title, message, { 
        classId, 
        delayMinutes 
      });
    } catch (error) {
      logger.error('Error notifying lecturer delay:', error);
      throw error;
    }
  },
};

module.exports = notificationService;
