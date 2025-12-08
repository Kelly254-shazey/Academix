const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Notification Routes
 * GET    /notifications/unread  - Get unread notifications
 * GET    /notifications         - Get all notifications
 * PUT    /notifications/:id/read - Mark as read
 * PUT    /notifications/read-all - Mark all as read
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get unread notifications
router.get('/unread', NotificationController.getUnreadNotifications);

// Get all notifications
router.get('/', NotificationController.getNotifications);

// Mark as read
router.put('/:notificationId/read', NotificationController.markAsRead);

// Mark all as read
router.put('/read-all', NotificationController.markAllAsRead);

module.exports = router;
