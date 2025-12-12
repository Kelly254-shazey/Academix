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

/**
 * GET /api/lecturer/overview
 * Get lecturer dashboard overview
 */
router.get('/overview', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;

    const result = await lecturerService.getLecturerOverview(lecturerId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching lecturer overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
router.get('/alerts', authenticateToken, isLecturer, async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const result = await lecturerService.getLecturerAlerts(lecturerId, limit);

    res.status(200).json({
      success: true,
      data: result.data,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

module.exports = router;
