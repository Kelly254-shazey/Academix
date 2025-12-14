const express = require('express');
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * GET /api/ai/insights
 * Get AI-generated insights for logged-in user based on role
 * Returns: Absenteeism predictions, anomalies, and recommendations
 */
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const insights = await aiService.getInsights();
    res.json({
      success: true,
      message: 'AI insights retrieved successfully',
      data: insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai/anomalies
 * Get attendance anomalies detected by AI
 */
router.get('/anomalies', authMiddleware, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    // TODO: Implement anomaly detection query from database
    // For now, return empty array
    res.json({
      success: true,
      message: 'Anomalies retrieved',
      data: [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve anomalies',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai/risk-predictions
 * Get absenteeism risk predictions for students
 */
router.get('/risk-predictions', authMiddleware, requireRole('lecturer', 'admin'), async (req, res) => {
  try {
    // TODO: Implement risk prediction query from database
    // For now, return empty array
    res.json({
      success: true,
      message: 'Risk predictions retrieved',
      data: [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Risk prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk predictions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
