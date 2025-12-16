const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const aiInsightsService = require('../services/aiInsightsService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/ai/absenteeism-risk
// Get absenteeism risk prediction
router.get('/absenteeism-risk', async (req, res) => {
  try {
    const result = await aiInsightsService.predictAbsenteeismRisk(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error predicting absenteeism risk:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/recommendations
// Get personalized recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const result = await aiInsightsService.getRecommendations(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/required-classes/:courseId
// Calculate required classes for minimum attendance
router.get('/required-classes/:courseId', async (req, res) => {
  try {
    const minimumAttendance = parseInt(req.query.minimum) || 75;
    const result = await aiInsightsService.calculateRequiredClasses(
      req.user.id,
      req.params.courseId,
      minimumAttendance
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error calculating required classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/predictions/:type
// Get specific AI prediction
router.get('/predictions/:type', async (req, res) => {
  try {
    const result = await aiInsightsService.getAIPrediction(req.user.id, req.params.type);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching prediction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/all-predictions
// Get all AI predictions for student
router.get('/all-predictions', async (req, res) => {
  try {
    const result = await aiInsightsService.getAllPredictions(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching all predictions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/performance-report
// Generate performance report
router.get('/performance-report', async (req, res) => {
  try {
    const result = await aiInsightsService.generatePerformanceReport(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
