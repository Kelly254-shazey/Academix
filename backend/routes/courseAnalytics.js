const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const courseAnalyticsService = require('../services/courseAnalyticsService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/analytics/course/:courseId
// Get course analytics
router.get('/course/:courseId', async (req, res) => {
  try {
    const result = await courseAnalyticsService.getCourseAnalytics(req.params.courseId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching course analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/course/:courseId/trends
// Get attendance trends
router.get('/course/:courseId/trends', async (req, res) => {
  try {
    const daysBack = parseInt(req.query.daysBack) || 30;
    const result = await courseAnalyticsService.getAttendanceTrends(req.params.courseId, daysBack);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching trends:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/course/:courseId/missed-classes
// Get missed classes breakdown
router.get('/course/:courseId/missed-classes', async (req, res) => {
  try {
    const result = await courseAnalyticsService.getMissedClassesBreakdown(req.params.courseId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching missed classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/course/:courseId/absentee-risk
// Get absentee risk assessment
router.get('/course/:courseId/absentee-risk', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;
    const result = await courseAnalyticsService.getAbsenteeRiskAssessment(req.params.courseId, threshold);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching risk assessment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/analytics/course/:courseId/update
// Update course analytics summary (admin only)
router.post('/course/:courseId/update', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'lecturer') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await courseAnalyticsService.updateCourseAnalyticsSummary(req.params.courseId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating course analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
