const express = require('express');
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /ai/insights
// Sample response: { "absenteeism_predictions": [...], "punctuality_scores": [...], "anomalies": [...] }
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const insights = await aiService.getInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
