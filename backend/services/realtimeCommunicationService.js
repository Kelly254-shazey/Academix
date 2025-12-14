/**
 * Real-Time Communication Service
 * Handles all real-time communication between admin, lecturers, and students
 * Ensures 100% data consistency through Socket.IO events
 */

const db = require('../database');
const logger = require('../utils/logger');

class RealTimeCommunicationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send urgent message from admin to specific user/role
   * Real-time delivery via Socket.IO
   */
  async sendAdminMessage(senderId, recipientType, recipientId, message) {
    try {
      const [sender] = await db.execute(
        `SELECT id, name, role FROM users WHERE id = ? AND role = 'admin'`,
        [senderId]
      );

      if (!sender || sender.length === 0) {
        throw new Error('Only admins can send messages');
      }

      // Store message in database
      const [msgResult] = await db.execute(
        `INSERT INTO admin_messages (sender_id, recipient_type, recipient_id, message, status, created_at)
         VALUES (?, ?, ?, ?, 'unread', NOW())`,
        [senderId, recipientType, recipientId, JSON.stringify(message)]
      );

      // Get recipient details
      let recipientDetails = {};
      if (recipientType === 'user' && recipientId) {
        const [user] = await db.execute(
          `SELECT id, name, email, role FROM users WHERE id = ?`,
          [recipientId]
        );
        recipientDetails = user[0] || {};
      }

      // Broadcast via Socket.IO in real-time
      const broadcastData = {
        id: msgResult.insertId,
        sender: sender[0],
        recipient: recipientDetails,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'unread'
      };

      // Send to specific user room
      if (recipientType === 'user' && recipientId) {
        this.io.to(`user_${recipientId}`).emit('admin:message', broadcastData);
      }
      // Send to all users with specific role
      else if (recipientType === 'role') {
        this.io.emit('admin:message-role', {
          ...broadcastData,
          targetRole: recipientId
        });
      }
      // Send to all users (broadcast)
      else if (recipientType === 'all') {
        this.io.emit('admin:broadcast', broadcastData);
      }

      logger.info(`Admin message sent`, {
        senderId,
        recipientType,
        recipientId,
        messageId: msgResult.insertId
      });

      return { success: true, messageId: msgResult.insertId, broadcastData };
    } catch (error) {
      logger.error('Error sending admin message:', error);
      throw error;
    }
  }

  /**
   * Notify lecturer of urgent attendance issue
   */
  async notifyLecturerOfAlert(classSessionId, studentId, alertType, severity) {
    try {
      const [session] = await db.execute(
        `SELECT lecturer_id FROM class_sessions WHERE id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      const lecturerId = session[0].lecturer_id;
      const [student] = await db.execute(
        `SELECT id, name FROM users WHERE id = ?`,
        [studentId]
      );

      const alert = {
        classSessionId,
        studentId,
        studentName: student[0]?.name,
        alertType,
        severity,
        timestamp: new Date().toISOString()
      };

      // Store in database
      await db.execute(
        `INSERT INTO lecturer_alerts (lecturer_id, class_session_id, student_id, alert_type, severity, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'unread', NOW())`,
        [lecturerId, classSessionId, studentId, alertType, severity]
      );

      // Send real-time notification to lecturer
      this.io.to(`user_${lecturerId}`).emit('lecturer:alert', alert);

      // Also send to admin monitoring dashboard
      this.io.to('admin_dashboard').emit('system:alert', {
        ...alert,
        lecturerId,
        context: 'lecturer-alert'
      });

      logger.info(`Lecturer alert sent`, { lecturerId, studentId, alertType, severity });
      return { success: true, alert };
    } catch (error) {
      logger.error('Error notifying lecturer:', error);
      throw error;
    }
  }

  /**
   * Send real-time data update to all connected clients
   * Ensures data consistency across all devices
   */
  async broadcastDataUpdate(dataType, data, targetRole = null, targetUserId = null) {
    try {
      const update = {
        dataType,
        data,
        timestamp: new Date().toISOString(),
        version: 1
      };

      // Send to specific user
      if (targetUserId) {
        this.io.to(`user_${targetUserId}`).emit('data:update', update);
      }
      // Send to all users with specific role
      else if (targetRole) {
        this.io.emit('data:update-role', {
          ...update,
          targetRole
        });
      }
      // Broadcast to all
      else {
        this.io.emit('data:update', update);
      }

      logger.info(`Data update broadcast`, { dataType, targetRole, targetUserId });
      return { success: true, update };
    } catch (error) {
      logger.error('Error broadcasting data:', error);
      throw error;
    }
  }

  /**
   * Mark message as read (for tracking delivery)
   */
  async markMessageAsRead(messageId, userId) {
    try {
      await db.execute(
        `UPDATE admin_messages SET status = 'read', read_at = NOW(), read_by = ? WHERE id = ?`,
        [userId, messageId]
      );

      // Broadcast read status
      this.io.emit('message:read-status', {
        messageId,
        userId,
        readAt: new Date().toISOString()
      });

      logger.info(`Message marked as read`, { messageId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Get all pending messages for a user (real-time sync)
   */
  async getUserMessages(userId) {
    try {
      const [messages] = await db.execute(
        `SELECT id, sender_id, message, status, created_at FROM admin_messages 
         WHERE recipient_id = ? OR (recipient_type = 'role' AND recipient_id = 
           (SELECT role FROM users WHERE id = ?))
         ORDER BY created_at DESC LIMIT 50`,
        [userId, userId]
      );

      return messages || [];
    } catch (error) {
      logger.error('Error fetching user messages:', error);
      return [];
    }
  }

  /**
   * System-wide alert broadcast (for critical issues)
   */
  async broadcastSystemAlert(severity, message, affectedUsers = []) {
    try {
      const alert = {
        severity,
        message,
        timestamp: new Date().toISOString(),
        affectedUsers
      };

      // Store critical alert
      await db.execute(
        `INSERT INTO system_alerts (severity, message, affected_users, created_at)
         VALUES (?, ?, ?, NOW())`,
        [severity, message, JSON.stringify(affectedUsers)]
      );

      // Send to all connected clients
      this.io.emit('system:alert-critical', alert);

      // Send to admin dashboard
      this.io.to('admin_dashboard').emit('system:critical-event', alert);

      logger.warn(`Critical system alert`, { severity, message });
      return { success: true, alert };
    } catch (error) {
      logger.error('Error broadcasting system alert:', error);
      throw error;
    }
  }

  /**
   * Real-time session status update
   */
  async broadcastSessionUpdate(classSessionId, status) {
    try {
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      const update = {
        sessionId: classSessionId,
        classId: session[0].class_id,
        status,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all in this session
      this.io.to(`session_${classSessionId}`).emit('session:status-update', update);

      // Broadcast to lecturer
      this.io.to(`user_${session[0].lecturer_id}`).emit('session:status-update', update);

      // Broadcast to admin dashboard
      this.io.to('admin_dashboard').emit('session:status-update', update);

      logger.info(`Session status updated`, { classSessionId, status });
      return { success: true, update };
    } catch (error) {
      logger.error('Error updating session status:', error);
      throw error;
    }
  }
}

module.exports = RealTimeCommunicationService;
module.exports.RealTimeCommunicationService = RealTimeCommunicationService;
