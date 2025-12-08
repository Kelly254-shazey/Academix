const NotificationService = require('../services/NotificationService');
const { sendSuccess, sendError, getPaginationParams } = require('../utils/helpers');

/**
 * Notification Controller
 * Manages real-time notifications
 */

class NotificationController {
  /**
   * Get unread notifications for current user
   */
  static async getUnreadNotifications(req, res, next) {
    try {
      const notifications = await NotificationService.getUnreadNotifications(req.user.id);
      const unreadCount = notifications.length;
      
      return sendSuccess(res, { notifications, unreadCount }, 'Unread notifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all notifications with pagination
   */
  static async getNotifications(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = getPaginationParams(req.query);
      const notifications = await NotificationService.getNotifications(
        req.user.id, 
        limit, 
        offset
      );

      return sendSuccess(res, notifications, 'Notifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;

      const notification = await NotificationService.markAsRead(notificationId);
      if (!notification) {
        return sendError(res, 'Notification not found', 404);
      }

      return sendSuccess(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req, res, next) {
    try {
      const count = await NotificationService.markAllAsRead(req.user.id);
      return sendSuccess(res, { updated: count }, `${count} notifications marked as read`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
