const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/notifications
// Get user notifications
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getNotifications(req.user.id, limit, offset, unreadOnly);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/notifications/unread-count
// Get unread notification count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications/mark-read
// Mark notifications as read
router.post('/mark-read', async (req, res) => {
    try {
      const result = await notificationService.markAsRead(req.body.ids, req.user.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/notifications/mark-unread
// Mark notifications as unread
router.post('/mark-unread', async (req, res) => {
    try {
      const result = await notificationService.markAsUnread(req.body.ids, req.user.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error marking notifications as unread:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/notifications/:id
// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications/clear
// Clear all notifications
router.post('/clear', async (req, res) => {
  try {
    const result = await notificationService.clearAllNotifications(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
