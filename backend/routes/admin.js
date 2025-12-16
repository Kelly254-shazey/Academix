const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const messageService = require('../services/messageService');
const { sendSuccess, sendError, sendValidationError } = require('../utils/responseHelper');

// In-memory storage for data manipulation audit log (for demo purposes)
const dataAuditLog = [];

// All admin endpoints require authentication
router.use(authenticateToken);

// ==================== MESSAGING ENDPOINTS ====================

// GET: Fetch admin chat with a specific student
router.get('/messages/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const messages = await messageService.getMessagesByStudentId(studentId);

    return sendSuccess(res, 'Messages retrieved successfully', {
      studentId,
      messages,
      unreadCount: messages.filter(m => !m.is_read && m.sender_type === 'student').length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return sendError(res, 'Failed to fetch messages', 500, process.env.NODE_ENV === 'development', error);
  }
});

// GET: Fetch all student conversations (admin view)
router.get('/messages/all', async (req, res) => {
  try {
    const conversations = await messageService.getConversations();

    return sendSuccess(res, 'Conversations retrieved successfully', {
      conversations,
      totalStudents: conversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return sendError(res, 'Failed to fetch conversations', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Send message from admin to student
router.post('/messages/send', async (req, res) => {
  try {
    const { studentId, message, senderId } = req.body;

    if (!studentId || !message) {
      return sendValidationError(res, 'Validation failed', ['studentId and message are required']);
    }
    
    const payload = {
      studentId,
      senderId: senderId || req.user.id,
      senderType: 'admin',
      message
    };
    const chatMessage = await messageService.sendMessage(payload);

    // Emit real-time notification via Socket.IO
    if (req.io) {
      req.io.to(`user_${studentId}`).emit('new-admin-message', {
        message: chatMessage.message,
        senderType: payload.senderType,
        timestamp: chatMessage.timestamp
      });

      req.io.to('admin').emit('message-sent', {
        studentId,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      });
    }

    return sendSuccess(res, 'Message sent successfully', chatMessage, 201);
  } catch (error) {
    console.error('Error sending message:', error);
    return sendError(res, 'Failed to send message', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Student sends message to admin
router.post('/messages/student-send', async (req, res) => {
  try {
    const { studentId, message } = req.body;

    if (!studentId || !message) {
      return sendValidationError(res, 'Validation failed', ['studentId and message are required']);
    }
    
    const payload = {
      studentId,
      senderId: studentId,
      senderType: 'student',
      message
    };
    const chatMessage = await messageService.sendMessage(payload);

    // Emit real-time notification via Socket.IO
    if (req.io) {
      req.io.to('admin').emit('new-student-message', {
        studentId,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      });
    }

    return sendSuccess(res, 'Message sent to admin successfully', chatMessage, 201);
  } catch (error) {
    console.error('Error sending message:', error);
    return sendError(res, 'Failed to send message', 500, process.env.NODE_ENV === 'development', error);
  }
});

// ==================== DATA MANIPULATION ENDPOINTS ====================

// ==================== DATA MANIPULATION ENDPOINTS ====================

// POST: Update student attendance record
router.post('/data/attendance/update', (req, res) => {
  try {
    const { studentId, lectureId, status, reason, courseName } = req.body;

    if (!studentId || !lectureId || !status) {
      return sendValidationError(res, 'Validation failed', ['studentId, lectureId, and status are required']);
    }

    // TODO: Replace with actual database update. Use parameterized queries to prevent SQL injection.
    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'attendance_update',
      targetStudentId: studentId,
      targetLectureId: lectureId,
      newStatus: status,
      reason,
      timestamp: new Date().toISOString(),
      adminId: req.user.id
    });

    return sendSuccess(res, 'Attendance record updated successfully', {
      studentId,
      lectureId,
      status,
      reason,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return sendError(res, 'Failed to update attendance', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Add or update student data
router.post('/data/student/update', (req, res) => {
  try {
    const { studentId, updates } = req.body;

    if (!studentId || !updates) {
      return sendValidationError(res, 'Validation failed', ['studentId and updates are required']);
    }

    // TODO: Replace with actual database update. Use parameterized queries to prevent SQL injection.
    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'student_data_update',
      targetStudentId: studentId,
      updates,
      timestamp: new Date().toISOString(),
      adminId: req.user.id
    });

    return sendSuccess(res, 'Student data updated successfully', {
      studentId,
      updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating student data:', error);
    return sendError(res, 'Failed to update student data', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Bulk update attendance records
router.post('/data/attendance/bulk-update', (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return sendValidationError(res, 'Validation failed', ['records array is required and must not be empty']);
    }

    // TODO: Replace with actual database update. Use parameterized queries to prevent SQL injection.
    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'bulk_attendance_update',
      recordCount: records.length,
      records,
      timestamp: new Date().toISOString(),
      adminId: req.user.id
    });

    return sendSuccess(res, `${records.length} attendance records updated successfully`, {
      recordCount: records.length,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error bulk updating attendance:', error);
    return sendError(res, 'Failed to bulk update attendance', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Delete or archive student record
router.post('/data/student/delete', (req, res) => {
  try {
    const { studentId, reason } = req.body;

    if (!studentId) {
      return sendValidationError(res, 'Validation failed', ['studentId is required']);
    }

    // TODO: Replace with actual database operation (delete or archive).
    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'student_delete',
      targetStudentId: studentId,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
      adminId: req.user.id
    });

    return sendSuccess(res, 'Student record deleted/archived successfully', {
      studentId,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting student record:', error);
    return sendError(res, 'Failed to delete student record', 500, process.env.NODE_ENV === 'development', error);
  }
});

// GET: View audit log
router.get('/audit-log', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const paginatedLog = dataAuditLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    return sendSuccess(res, 'Audit log retrieved successfully', {
      auditLog: paginatedLog,
      total: dataAuditLog.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return sendError(res, 'Failed to fetch audit log', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST: Export student data (CSV format)
router.post('/data/export', (req, res) => {
  try {
    const { studentIds, dataType } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return sendValidationError(res, 'Validation failed', ['studentIds array is required and must not be empty']);
    }

    // TODO: Replace with actual data export logic (e.g., generating a CSV file).
    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'data_export',
      recordCount: studentIds.length,
      dataType: dataType || 'all',
      timestamp: new Date().toISOString(),
      adminId: req.user.id
    });

    return sendSuccess(res, 'Data exported successfully', {
      recordCount: studentIds.length,
      dataType: dataType || 'all',
      exportedAt: new Date().toISOString(),
      fileFormat: 'csv'
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return sendError(res, 'Failed to export data', 500, process.env.NODE_ENV === 'development', error);
  }
});

// GET: Student communication statistics
router.get('/communication/stats', async (req, res) => {
  try {
    const stats = await messageService.getCommunicationStats();
    return sendSuccess(res, 'Communication statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    return sendError(res, 'Failed to fetch communication statistics', 500, process.env.NODE_ENV === 'development', error);
  }
});

module.exports = router;
