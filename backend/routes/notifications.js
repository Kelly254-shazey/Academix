const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

// In-memory storage for notifications (replace with database in production)
const notifications = {};
const userNotifications = {};

// Send notification from lecturer to students
router.post('/send', (req, res) => {
  try {
    const { type, title, message, courseId, instructorId, instructorName, targetUsers, classTime, location, studentName, absenceReason } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notificationId = `notif_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const notification = {
      id: notificationId,
      type,
      title: title || 'New Notification',
      message,
      courseId,
      instructorId,
      instructorName,
      classTime,
      location,
      studentName,
      absenceReason,
      timestamp: timestamp,
      read: false,
      delivered: true,
      deliveredAt: timestamp
    };

    // Store notification
    if (!notifications[notificationId]) {
      notifications[notificationId] = notification;
    }

    // Distribute to target users (if specific users provided) or all students in course
    const recipientIds = targetUsers || []; // Would normally get from course roster
    
    recipientIds.forEach(userId => {
      if (!userNotifications[userId]) {
        userNotifications[userId] = [];
      }
      userNotifications[userId].push({
        ...notification,
        read: false
      });
    });

    // Emit real-time update via Socket.IO (INSTANT delivery)
    if (req.io) {
      console.log(`📢 Broadcasting notification "${title}" to all connected students`);

      // Broadcast to all connected students (instant real-time)
      req.io.emit('new-notification', {
        ...notification,
        read: false
      });

      // Also send to specific recipient rooms if available
      recipientIds.forEach(userId => {
        req.io.to(`user_${userId}`).emit('new-notification', {
          ...notification,
          read: false
        });
      });

      // Notify all students in course room
      if (courseId) {
        req.io.to(`course_${courseId}`).emit('new-notification', {
          ...notification,
          read: false
        });
      }
    }

    res.status(201).json({
      success: true,
      notificationId,
      message: `Notification sent instantly to all connected students`,
      notification,
      delivered: true,
      recipientCount: recipientIds.length
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notifications for a user
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userNotifs = userNotifications[userId] || [];

    res.json({
      success: true,
      notifications: userNotifs,
      total: userNotifs.length,
      unread: userNotifs.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    if (userNotifications[userId]) {
      const notif = userNotifications[userId].find(n => n.id === notificationId);
      if (notif) {
        notif.read = true;
      }
    }

    // Emit real-time update
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notification-read', { notificationId });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a notification for a user
router.delete('/:notificationId', (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    if (userNotifications[userId]) {
      const initialLength = userNotifications[userId].length;
      userNotifications[userId] = userNotifications[userId].filter(
        (n) => n.id !== notificationId
      );
      if (userNotifications[userId].length === initialLength) {
        // No notification was found/deleted, but we don't treat it as a server error.
        return res.status(404).json({ success: false, message: 'Notification not found for this user' });
      }
    }

    // Emit real-time update
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notification-deleted', { notificationId });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count for a user
router.get('/user/:userId/unread-count', (req, res) => {
  try {
    const { userId } = req.params;
    const userNotifs = userNotifications[userId] || [];
    const unreadCount = userNotifs.filter(n => !n.read).length;

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all notifications (admin/lecturer)
router.get('/lecturer/:lecturerId/sent', (req, res) => {
  try {
    const { lecturerId } = req.params;

    const sentNotifications = Object.values(notifications).filter(
      n => n.instructorId === lecturerId
    );

    res.json({
      success: true,
      notifications: sentNotifications,
      total: sentNotifications.length
    });
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
