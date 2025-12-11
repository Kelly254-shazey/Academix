/**
 * AI Routes
 */

const express = require('express');
const router = express.Router();
const AIService = require('../services/AIService');
const { authenticateToken, verifyRole } = require('../middleware/auth');

/**
 * Absenteeism prediction
 * GET /api/ai/predict/absenteeism/:courseId
 */
router.get('/predict/absenteeism/:courseId', authenticateToken, verifyRole(['student', 'admin']), async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    const result = await AIService.predictAbsenteeismRisk(studentId, courseId);
    res.json(result);
  } catch (err) {
    console.error('Absenteeism prediction error:', err);
    res.status(500).json({
      success: false,
      error: 'Prediction failed',
    });
  }
});

/**
 * Anomaly detection
 * GET /api/ai/anomalies/:classId
 */
router.get('/anomalies/:classId', authenticateToken, verifyRole(['lecturer', 'admin']), async (req, res) => {
  try {
    const { classId } = req.params;

    const result = await AIService.detectAttendanceAnomalies(classId);
    res.json(result);
  } catch (err) {
    console.error('Anomaly detection error:', err);
    res.status(500).json({
      success: false,
      error: 'Anomaly detection failed',
    });
  }
});

/**
 * Course trends analysis
 * GET /api/ai/trends/:courseId
 */
router.get('/trends/:courseId', authenticateToken, verifyRole(['lecturer', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { daysBack = 30 } = req.query;

    const result = await AIService.analyzeCourseTrends(courseId, daysBack);
    res.json(result);
  } catch (err) {
    console.error('Trend analysis error:', err);
    res.status(500).json({
      success: false,
      error: 'Trend analysis failed',
    });
  }
});

/**
 * Lecturer insights
 * GET /api/ai/lecturer/insights
 */
router.get('/lecturer/insights', authenticateToken, verifyRole(['lecturer']), async (req, res) => {
  try {
    const lecturerId = req.user.userId;

    const result = await AIService.getLecturerInsights(lecturerId);
    res.json(result);
  } catch (err) {
    console.error('Lecturer insights error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
    });
  }
});

module.exports = router;
