const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middlewares/validation');
const schemas = require('../validators/schemas');
const attendanceAnalyticsService = require('../services/attendanceAnalyticsService');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/attendance/overall
// Get overall attendance percentage
router.get('/overall', async (req, res) => {
  try {
    const result = await attendanceAnalyticsService.getOverallAttendance(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching overall attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/per-course
// Get attendance per course
router.get('/per-course', async (req, res) => {
  try {
    const result = await attendanceAnalyticsService.getAttendancePerCourse(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching per-course attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/analytics
// Get attendance analytics with trends
router.get(
  '/analytics',
  validateQuery(schemas.attendanceAnalyticsSchema),
  async (req, res) => {
    try {
      const { start_date, end_date, include_trends } = req.validatedQuery;
      const result = await attendanceAnalyticsService.getAttendanceAnalytics(
        req.user.id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: result,
        includeTrends: include_trends,
      });
    } catch (error) {
      logger.error('Error fetching attendance analytics:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/attendance/low-threshold-check
// Check if student is below attendance threshold
router.get('/low-threshold-check', async (req, res) => {
  try {
    const threshold = req.query.threshold || 75;
    const result = await attendanceAnalyticsService.checkLowAttendanceThreshold(
      req.user.id,
      threshold
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking low attendance threshold:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/missed-classes
// Get missed classes
router.get('/missed-classes', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const result = await attendanceAnalyticsService.getMissedClasses(req.user.id, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching missed classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/absentee-risk
// Get absentee risk assessment
router.get('/absentee-risk', async (req, res) => {
  try {
    const result = await attendanceAnalyticsService.getAbsenteeRisk(req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching absentee risk:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/summary
// Get attendance summary for date range
router.get(
  '/summary',
  validateQuery(schemas.analyticsQuerySchema),
  async (req, res) => {
    try {
      const { start_date, end_date } = req.validatedQuery;
      const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const result = await attendanceAnalyticsService.getAttendanceSummary(
        req.user.id,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching attendance summary:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
