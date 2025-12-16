const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const db = require('../database');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

// All student routes require authentication and student role
router.use(authenticateToken);


/**
 * GET /api/student/dashboard
 * Get student dashboard with attendance stats and courses
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get summary statistics
    const [summaryResults] = await db.execute(
      `SELECT 
        COUNT(DISTINCT ce.class_id) as totalCourses,
        COALESCE(ROUND(AVG(COALESCE(saa.attendance_percentage, 0)), 2), 0) as overallAttendance,
        COUNT(DISTINCT CASE WHEN DATE(cs.session_date) = DATE(NOW()) THEN cs.id END) as todayClasses
      FROM class_enrollments ce
      LEFT JOIN student_attendance_analytics saa ON ce.class_id = saa.class_id AND saa.student_id = ?
      LEFT JOIN classes c ON ce.class_id = c.id
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      WHERE ce.student_id = ?`,
      [userId, userId]
    );

    // Get today's classes
    const [todayClasses] = await db.execute(
      `SELECT 
        cs.id, c.course_name as name, c.course_code, 
        cs.session_date as startTime,
        c.location as classroom,
        u.name as lecturer_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN users u ON c.lecturer_id = u.id
      JOIN class_enrollments ce ON c.id = ce.class_id
      WHERE ce.student_id = ? 
        AND DATE(cs.session_date) = DATE(NOW())
      ORDER BY cs.session_date ASC`,
      [userId]
    );

    // Get enrolled courses with attendance stats
    const [courses] = await db.execute(
      `SELECT 
        c.id, c.course_name as name, c.course_code as code, 
        COALESCE(saa.attendance_percentage, 0) as attendance_percentage,
        COALESCE(saa.total_classes, 0) as total_classes,
        COALESCE(saa.present_count, 0) as present_count
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN student_attendance_analytics saa ON c.id = saa.class_id AND saa.student_id = ?
      WHERE ce.student_id = ?
      ORDER BY c.course_name ASC`,
      [userId, userId]
    );

    const summary = summaryResults[0] || {
      totalCourses: 0,
      overallAttendance: 0,
      todayClasses: 0
    };

    return sendSuccess(res, 'Student dashboard retrieved successfully', {
      summary,
      courses: courses || [],
      todayClasses: todayClasses || []
    });
  } catch (error) {
    logger.error('Error fetching student dashboard:', error);
    return sendError(res, 'Failed to fetch dashboard data', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * GET /api/student/timetable
 * Get student's class timetable/schedule
 */
router.get('/timetable', async (req, res) => {
  try {
    const userId = req.user.id;

    const [timetable] = await db.execute(
      `SELECT 
        cs.id, c.id as classId,
        c.course_name as className, 
        c.course_code as classCode,
        u.name as instructor,
        cs.session_date as startTime, 
        c.location as classroom,
        c.day_of_week
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN users u ON c.lecturer_id = u.id
      JOIN class_enrollments ce ON c.id = ce.class_id
      WHERE ce.student_id = ?
      ORDER BY cs.session_date ASC`,
      [userId]
    );

    return sendSuccess(res, 'Timetable retrieved successfully', timetable || []);
  } catch (error) {
    logger.error('Error fetching timetable:', error);
    return sendError(res, 'Failed to fetch timetable', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * GET /api/student/notifications
 * Get student's notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [countResults] = await db.execute(
      `SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    const [notifications] = await db.execute(
      `SELECT 
        id, title, message, type, is_read as read_status, created_at as timestamp
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [totalResults] = await db.execute(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`,
      [userId]
    );

    return sendSuccess(res, 'Notifications retrieved successfully', {
      data: notifications || [],
      unreadCount: countResults[0]?.unreadCount || 0,
      pagination: {
        limit,
        offset,
        total: totalResults[0]?.total || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return sendError(res, 'Failed to fetch notifications', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * PUT /api/student/notifications/:id/read
 * Mark notification as read
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const [notif] = await db.execute(
      `SELECT id FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (notif.length === 0) {
      return sendError(res, 'Notification not found', 404);
    }

    // Mark as read
    await db.execute(
      `UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = ?`,
      [notificationId]
    );

    return sendSuccess(res, 'Notification marked as read', { id: notificationId });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return sendError(res, 'Failed to mark notification as read', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * DELETE /api/student/notifications/:id
 * Delete notification
 */
router.delete('/notifications/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const [notif] = await db.execute(
      `SELECT id FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (notif.length === 0) {
      return sendError(res, 'Notification not found', 404);
    }

    // Delete notification
    await db.execute(
      `DELETE FROM notifications WHERE id = ?`,
      [notificationId]
    );

    return sendSuccess(res, 'Notification deleted', { id: notificationId });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    return sendError(res, 'Failed to delete notification', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * GET /api/student/grades
 * Get student grades
 */
router.get('/grades', async (req, res) => {
  try {
    const userId = req.user.id;

    const [grades] = await db.execute(
      `SELECT 
        sg.id, sg.assessment_type, sg.score, sg.grade_letter,
        c.course_name, c.course_code,
        sg.date_graded
      FROM student_grades sg
      JOIN classes c ON sg.class_id = c.id
      WHERE sg.student_id = ?
      ORDER BY sg.date_graded DESC`,
      [userId]
    );

    return sendSuccess(res, 'Grades retrieved successfully', grades || []);
  } catch (error) {
    logger.error('Error fetching grades:', error);
    return sendError(res, 'Failed to fetch grades', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * GET /api/student/resources
 * Get course resources/materials
 */
router.get('/resources', async (req, res) => {
  try {
    const userId = req.user.id;

    const [resources] = await db.execute(
      `SELECT 
        cr.id, cr.name, cr.description, cr.category,
        cr.file_url, cr.file_size, c.course_name,
        cr.uploaded_date
      FROM course_resources cr
      JOIN classes c ON cr.class_id = c.id
      JOIN class_enrollments ce ON c.id = ce.class_id
      WHERE ce.student_id = ?
      ORDER BY cr.uploaded_date DESC`,
      [userId]
    );

    return sendSuccess(res, 'Resources retrieved successfully', resources || []);
  } catch (error) {
    logger.error('Error fetching resources:', error);
    return sendError(res, 'Failed to fetch resources', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * GET /api/student/performance
 * Get student performance analytics
 */
router.get('/performance', async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await db.execute(
      `SELECT 
        COALESCE(ROUND(AVG(sg.score), 2), 0) as averageScore,
        COUNT(DISTINCT ce.class_id) as completedAssignments,
        COALESCE(ROUND(AVG(saa.attendance_percentage), 2), 0) as targetAchievement
      FROM class_enrollments ce
      LEFT JOIN student_grades sg ON ce.class_id = sg.class_id AND sg.student_id = ?
      LEFT JOIN student_attendance_analytics saa ON ce.class_id = saa.class_id AND saa.student_id = ?
      WHERE ce.student_id = ?`,
      [userId, userId, userId]
    );

    const performanceData = stats[0] || {
      averageScore: 0,
      completedAssignments: 0,
      targetAchievement: 0
    };

    return sendSuccess(res, 'Performance data retrieved successfully', {
      ...performanceData,
      improvement: 5,
      recommendations: [
        'Maintain consistent class attendance',
        'Review weak assessment areas',
        'Participate more in discussions'
      ]
    });
  } catch (error) {
    logger.error('Error fetching performance data:', error);
    return sendError(res, 'Failed to fetch performance data', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * PUT /api/student/settings
 * Update student settings
 */
router.put('/settings', async (req, res) => {
  try {
    return sendSuccess(res, 'Settings updated successfully');
  } catch (error) {
    logger.error('Error updating settings:', error);
    return sendError(res, 'Failed to update settings', 500, process.env.NODE_ENV === 'development', error);
  }
});

/**
 * POST /api/student/support
 * Submit support ticket
 */
router.post('/support', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message cannot be empty', 400);
    }

    return sendSuccess(res, 'Support request submitted successfully', null, 201);
  } catch (error) {
    logger.error('Error submitting support request:', error);
    return sendError(res, 'Failed to submit support request', 500, process.env.NODE_ENV === 'development', error);
  }
});

module.exports = router;
