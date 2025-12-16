/**
 * Admin Communication Routes
 * Real-time communication endpoints from admin to lecturers/students
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const logger = require('../utils/logger');

/**
 * POST /api/admin/communicate/message/:userId
 * Send direct message from admin to a specific user
 */
router.post('/communicate/message/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, messageType = 'info', priority = 'normal' } = req.body;
    const adminId = req.user.id;

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum length of 1000 characters',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Verify recipient exists
    const [recipient] = await db.execute(
      `SELECT id, name, role FROM users WHERE id = ?`,
      [userId]
    );

    if (!recipient || recipient.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Use global communication service
    const result = await global.communicationService.sendAdminMessage(
      adminId,
      'user',
      userId,
      {
        message,
        messageType,
        priority,
        timestamp: new Date().toISOString()
      }
    );

    logger.info('Admin message sent to user', {
      adminId,
      userId,
      messageType,
      priority
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result.broadcastData
    });
  } catch (error) {
    logger.error('Error sending admin message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/communicate/broadcast/:role
 * Send broadcast message to all users with specific role
 */
router.post('/communicate/broadcast/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const { message, messageType = 'announcement', priority = 'normal' } = req.body;
    const adminId = req.user.id;

    // Validate role
    const validRoles = ['student', 'lecturer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: student, lecturer, or admin',
        code: 'INVALID_ROLE'
      });
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
        code: 'EMPTY_MESSAGE'
      });
    }

    // Use global communication service
    const result = await global.communicationService.sendAdminMessage(
      adminId,
      'role',
      role,
      {
        message,
        messageType,
        priority,
        broadcast: true,
        timestamp: new Date().toISOString()
      }
    );

    logger.info('Admin broadcast sent to role', {
      adminId,
      role,
      messageType,
      priority
    });

    res.json({
      success: true,
      message: `Broadcast sent to all ${role}s`,
      data: result.broadcastData
    });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/communicate/alert
 * Send urgent system alert to all connected users
 */
router.post('/communicate/alert', authenticateToken, async (req, res) => {
  try {
    const { message, severity = 'warning', affectedUsers = [] } = req.body;
    const adminId = req.user.id;

    // Validate severity
    const validSeverities = ['info', 'warning', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity. Must be: info, warning, or critical',
        code: 'INVALID_SEVERITY'
      });
    }

    // Use global communication service
    const result = await global.communicationService.broadcastSystemAlert(
      severity,
      message,
      affectedUsers
    );

    logger.warn('System alert sent by admin', {
      adminId,
      severity,
      message,
      affectedUsers: affectedUsers.length
    });

    res.json({
      success: true,
      message: 'Alert broadcast to all users',
      data: result.alert
    });
  } catch (error) {
    logger.error('Error sending system alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send alert',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/communicate/messages/:userId
 * Retrieve all messages received by a user
 */
router.get('/communicate/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await global.communicationService.getUserMessages(userId);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/communicate/alert/lecturer/:classSessionId
 * Send urgent alert to lecturer about a specific class session
 */
router.post('/communicate/alert/lecturer/:classSessionId', authenticateToken, async (req, res) => {
  try {
    const { classSessionId } = req.params;
    const { message, alertType = 'general', severity = 'warning' } = req.body;
    const adminId = req.user.id;

    // Get class session and lecturer
    const [session] = await db.execute(
      `SELECT cs.lecturer_id, c.course_name FROM class_sessions cs
       JOIN classes c ON cs.class_id = c.id
       WHERE cs.id = ?`,
      [classSessionId]
    );

    if (!session || session.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const lecturerId = session[0].lecturer_id;

    // Send direct message to lecturer via Socket.IO
    if (global.io) {
      global.io.to(`user_${lecturerId}`).emit('admin:urgent-alert', {
        sessionId: classSessionId,
        courseName: session[0].course_name,
        message,
        alertType,
        severity,
        sentBy: adminId,
        timestamp: new Date().toISOString()
      });
    }

    // Store in database
    await db.execute(
      `INSERT INTO admin_alerts_log (admin_id, lecturer_id, class_session_id, message, alert_type, severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [adminId, lecturerId, classSessionId, message, alertType, severity]
    );

    logger.info('Admin alert sent to lecturer', {
      adminId,
      lecturerId,
      classSessionId,
      severity
    });

    res.json({
      success: true,
      message: 'Alert sent to lecturer',
      data: {
        lecturerId,
        sessionId: classSessionId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error sending lecturer alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send alert',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/communicate/mark-read/:messageId
 * Mark a message as read
 */
router.post('/communicate/mark-read/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const result = await global.communicationService.markMessageAsRead(messageId, userId);

    res.json({
      success: true,
      message: 'Message marked as read',
      data: result
    });
  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

module.exports = router;
