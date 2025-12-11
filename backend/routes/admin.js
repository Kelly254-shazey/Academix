const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');

// In-memory storage for data manipulation audit log (for demo purposes)
const dataAuditLog = [];

// ==================== MESSAGING ENDPOINTS ====================

// GET: Fetch admin chat with a specific student
router.get('/messages/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const messages = await messageService.getMessagesByStudentId(studentId);

    res.json({
      success: true,
      studentId,
      messages,
      unreadCount: messages.filter(m => !m.is_read && m.sender_type === 'student').length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// GET: Fetch all student conversations (admin view)
router.get('/messages/all', async (req, res) => {
  try {
    const conversations = await messageService.getConversations();

    res.json({
      success: true,
      conversations,
      totalStudents: conversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// POST: Send message from admin to student
router.post('/messages/send', async (req, res) => {
  try {
    const { studentId, message, senderId } = req.body;

    if (!studentId || !message) {
      return res.status(400).json({
        success: false,
        message: 'studentId and message are required'
      });
    }
    
    const payload = {
      studentId,
      senderId: senderId || 'admin_001',
      senderType: 'admin',
      message
    };
    const chatMessage = await messageService.sendMessage(payload);

    // Emit real-time notification via Socket.IO
    if (req.io) {
      req.io.to(`user_${studentId}`).emit('new-admin-message', {
        message: chatMessage.message,
        senderType: senderType || 'admin',
        timestamp: chatMessage.timestamp
      });

      // Notify admin of message
      req.io.to('admin_001').emit('new-student-message', {
        studentId,
        studentName: studentName || 'Unknown Student',
        message,
        timestamp: chatMessage.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// POST: Student sends message to admin
router.post('/messages/student-send', async (req, res) => {
  try {
    const { studentId, message } = req.body;

    if (!studentId || !message) {
      return res.status(400).json({
        success: false,
        message: 'studentId and message are required'
      });
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
      req.io.to('admin_001').emit('new-student-message', {
        studentId,
        studentName: studentName || 'Unknown Student',
        message,
        timestamp: chatMessage.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Message sent to admin successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// ==================== DATA MANIPULATION ENDPOINTS ====================

// POST: Update student attendance record
router.post('/data/attendance/update', (req, res) => {
  try {
    const { studentId, lectureId, status, reason, courseName } = req.body;

    if (!studentId || !lectureId || !status) {
      return res.status(400).json({
        success: false,
        message: 'studentId, lectureId, and status are required'
      });
    }

    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'attendance_update',
      targetStudentId: studentId,
      targetLectureId: lectureId,
      newStatus: status,
      reason,
      timestamp: new Date().toISOString(),
      adminId: 'admin_001'
    });

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: {
        studentId,
        lectureId,
        status,
        reason,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance',
      error: error.message
    });
  }
});

// POST: Add or update student data
router.post('/data/student/update', (req, res) => {
  try {
    const { studentId, updates } = req.body;

    if (!studentId || !updates) {
      return res.status(400).json({
        success: false,
        message: 'studentId and updates are required'
      });
    }

    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'student_data_update',
      targetStudentId: studentId,
      updates,
      timestamp: new Date().toISOString(),
      adminId: 'admin_001'
    });

    res.json({
      success: true,
      message: 'Student data updated successfully',
      data: {
        studentId,
        updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating student data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student data',
      error: error.message
    });
  }
});

// POST: Bulk update attendance records
router.post('/data/attendance/bulk-update', (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'records array is required'
      });
    }

    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'bulk_attendance_update',
      recordCount: records.length,
      records,
      timestamp: new Date().toISOString(),
      adminId: 'admin_001'
    });

    res.json({
      success: true,
      message: `${records.length} attendance records updated successfully`,
      data: {
        recordCount: records.length,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error bulk updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update attendance',
      error: error.message
    });
  }
});

// POST: Delete or archive student record
router.post('/data/student/delete', (req, res) => {
  try {
    const { studentId, reason } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }

    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'student_delete',
      targetStudentId: studentId,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
      adminId: 'admin_001'
    });

    res.json({
      success: true,
      message: 'Student record deleted/archived successfully',
      data: {
        studentId,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting student record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student record',
      error: error.message
    });
  }
});

// GET: View audit log
router.get('/audit-log', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const paginatedLog = dataAuditLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      auditLog: paginatedLog,
      total: dataAuditLog.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
});

// POST: Export student data (CSV format)
router.post('/data/export', (req, res) => {
  try {
    const { studentIds, dataType } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required'
      });
    }

    // Log the audit trail
    dataAuditLog.push({
      id: `audit_${Date.now()}`,
      action: 'data_export',
      recordCount: studentIds.length,
      dataType: dataType || 'all',
      timestamp: new Date().toISOString(),
      adminId: 'admin_001'
    });

    res.json({
      success: true,
      message: 'Data exported successfully',
      data: {
        recordCount: studentIds.length,
        dataType: dataType || 'all',
        exportedAt: new Date().toISOString(),
        fileFormat: 'csv'
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

// GET: Student communication statistics
router.get('/communication/stats', async (req, res) => {
  try {
    const stats = await messageService.getCommunicationStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communication stats',
      error: error.message
    });
  }
});

module.exports = router;
