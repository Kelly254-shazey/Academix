const express = require('express');
const authMiddleware = require('../middleware/auth');
const gamificationService = require('../services/gamificationService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// GET /api/gamification/badges
// Get student badges
router.get('/badges', async (req, res) => {
  try {
    const result = await gamificationService.getStudentBadges(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching badges:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gamification/streaks
// Get attendance streaks
router.get('/streaks', async (req, res) => {
  try {
    const result = await gamificationService.getAllStreaks(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching streaks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gamification/progress
// Get student progress
router.get('/progress', async (req, res) => {
  try {
    const result = await gamificationService.getStudentProgress(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gamification/streak/:courseId
// Get streak for specific course
router.get('/streak/:courseId', async (req, res) => {
  try {
    const result = await gamificationService.getAttendanceStreak(req.user.id, req.params.courseId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching course streak:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
