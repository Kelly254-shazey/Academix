// lecturer.js
// Lecturer Dashboard API Routes
// GET /api/lecturer/overview - Dashboard overview
// GET /api/lecturer/today-classes - Today's classes
// GET /api/lecturer/next-class - Next upcoming class
// GET /api/lecturer/stats - Attendance statistics
// GET /api/lecturer/alerts - Lecturer alerts
// POST /api/lecturer/alerts/acknowledge - Mark alerts as read
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router();
const lecturerService = require('../services/lecturerService');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  lecturerOverviewSchema,
  lecturerStatsSchema,
  alertAcknowledgeSchema,
} = require('../validators/lecturerSchemas');
const logger = require('../utils/logger');

// Middleware: Verify lecturer role
const isLecturer = (req, res, next) => {
  if (req.user.role !== 'lecturer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Lecturer role required.',
    });
  }
  next();
};

// Rate limiting map
const requestCounts = new Map();

// Simple rate limiter
const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = requestCounts.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please slow down'
      });
    }
    
    record.count++;
    next();
  };
};

// Simple test route without auth for debugging
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Lecturer API is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/lecturer/overview
 * Get lecturer dashboard overview
 */
router.get('/overview', rateLimit(5, 10000), async (req, res) => {
  try {
    console.log('🔧 DEBUG: Lecturer overview requested from', req.ip);
    
    const result = await lecturerService.getLecturerOverview('lecturer_1');
    
    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('🔧 DEBUG: Error in overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
      error: error.message,
    });
  }
});

/**
 * GET /api/lecturer/today-classes
 * Get all classes for today
 */
router.get('/today-classes', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getTodayClasses(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('Error fetching today classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/next-class
 * Get next upcoming class with time remaining
 */
router.get('/next-class', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getNextClass(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching next class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch next class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/stats
 * Get quick attendance statistics
 */
router.get('/stats', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getQuickAttendanceStats(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/statistics
 * Get detailed statistics for date range
 */
router.get('/statistics', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required',
      });
    }

    const result = await lecturerService.getLecturerStatistics(
      lecturerId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/alerts
 * Get lecturer alerts (unread)
 */
router.get('/alerts', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Lecturer alerts requested');
    
    const result = await lecturerService.getLecturerAlerts('lecturer_1');
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log('🔧 DEBUG: Returning real alerts:', result.data);

    res.status(200).json({
      success: true,
      data: result.data,
      count: result.data.length,
    });
  } catch (error) {
    console.error('🔧 DEBUG: Error in alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message,
    });
  }
});

/**
 * POST /api/lecturer/alerts/acknowledge
 * Mark alerts as read
 */
router.post('/alerts/acknowledge', authenticateToken, isLecturer, async (req, res) => {
  try {
    const { error, value } = alertAcknowledgeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message,
      });
    }

    const lecturerId = req.user.id;
    const { alertIds } = value;

    const result = await lecturerService.markAlertsAsRead(
      lecturerId,
      alertIds
    );

    res.status(200).json({
      success: result.success,
      message: 'Alerts marked as read',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error acknowledging alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/profile
 * Get lecturer profile information
 */
router.get('/profile', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    // Return user profile from auth middleware
    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        phone: req.user.phone,
        profilePicture: req.user.profilePicture,
      },
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/classes
 * Get all classes assigned to lecturer
 */
router.get('/classes', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Lecturer classes requested');
    
    const result = await lecturerService.getLecturerClasses('lecturer_1');
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log('🔧 DEBUG: Returning real sessions:', result.data);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('🔧 DEBUG: Error in classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message,
    });
  }
});

/**
 * GET /api/lecturer/classes/:classId/roster
 * Get class roster for a specific class
 */
router.get('/classes/:classId/roster', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { classId } = req.params;

    const result = await lecturerService.getClassRoster(lecturerId, classId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching class roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class roster',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/classes/:classId/start
 * Start a class session
 */
router.post('/classes/:classId/start', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { classId } = req.params;

    const result = await lecturerService.startClassSession(lecturerId, classId);

    res.status(200).json({
      success: true,
      message: 'Class session started successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error starting class session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start class session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/classes/:classId/delay
 * Delay a class session
 */
router.post('/classes/:classId/delay', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { classId } = req.params;
    const { delayMinutes, reason } = req.body;

    const result = await lecturerService.delayClassSession(lecturerId, classId, delayMinutes, reason);

    res.status(200).json({
      success: true,
      message: 'Class session delayed successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error delaying class session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delay class session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/classes/:classId/cancel
 * Cancel a class session
 */
router.post('/classes/:classId/cancel', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { classId } = req.params;
    const { reason } = req.body;

    const result = await lecturerService.cancelClassSession(lecturerId, classId, reason);

    res.status(200).json({
      success: true,
      message: 'Class session cancelled successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error cancelling class session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel class session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/lecturer/classes/:classId/room
 * Change room for a class
 */
router.put('/classes/:classId/room', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { classId } = req.params;
    const { newRoom } = req.body;

    const result = await lecturerService.changeClassRoom(lecturerId, classId, newRoom);

    res.status(200).json({
      success: true,
      message: 'Class room changed successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error changing class room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change class room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/attendance/manual
 * Manually mark attendance for a student
 */
router.post('/attendance/manual', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { studentId, classId, sessionId, status, reason } = req.body;

    const result = await lecturerService.markManualAttendance(lecturerId, studentId, classId, sessionId, status, reason);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error marking manual attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/messages
 * Get messages for lecturer
 */
router.get('/messages', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getLecturerMessages(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching lecturer messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/messages
 * Send a message from lecturer
 */
router.post('/messages', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { recipientId, subject, message, classId } = req.body;

    const result = await lecturerService.sendLecturerMessage(lecturerId, recipientId, subject, message, classId);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error sending lecturer message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lecturer/reports
 * Get lecturer reports
 */
router.get('/reports', async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    const result = await lecturerService.getLecturerReports('lecturer_1', startDate, endDate, reportType);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching lecturer reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// POST: Create new class
router.post('/classes/create', async (req, res) => {
  try {
    const { name, time, room, expectedStudents } = req.body;
    
    if (!name || !time) {
      return res.status(400).json({
        success: false,
        message: 'Class name and time are required'
      });
    }
    
    const result = await lecturerService.createClass('lecturer_1', {
      name, time, room, expectedStudents
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message
    });
  }
});

// POST: Update student CAT scores
router.post('/students/:studentId/cat', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseName, catNumber, score, maxScore, date } = req.body;
    
    if (!courseName || !catNumber || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Course name, CAT number, and score are required'
      });
    }
    
    const result = await lecturerService.updateStudentCAT('lecturer_1', studentId, {
      courseName, catNumber, score, maxScore, date
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(200).json({
      success: true,
      message: 'CAT score updated successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update CAT score',
      error: error.message
    });
  }
});

// GET: Get lecturer permissions
router.get('/permissions', async (req, res) => {
  try {
    const permissions = lecturerService.getLecturerPermissions('lecturer_1');
    
    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions',
      error: error.message
    });
  }
});

/**
 * GET /api/lecturer/support
 * Get lecturer support tickets
 */
router.get('/support', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getLecturerSupportTickets(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching lecturer support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lecturer/support
 * Create a support ticket for lecturer
 */
router.post('/support', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const { subject, description, priority, category } = req.body;

    const result = await lecturerService.createLecturerSupportTicket(lecturerId, subject, description, priority, category);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Error creating lecturer support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
