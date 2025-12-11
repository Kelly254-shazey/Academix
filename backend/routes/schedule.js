const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateRequest } = require('../middlewares/validation');
const schemas = require('../validators/schemas');
const dailyScheduleService = require('../services/dailyScheduleService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// GET /api/schedule/today
// Get today's classes for student
router.get('/today', async (req, res) => {
  try {
    const result = await dailyScheduleService.getTodayClasses(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching today classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/schedule/upcoming
// Get upcoming classes
router.get('/upcoming', async (req, res) => {
  try {
    const daysAhead = req.query.daysAhead || 7;
    const result = await dailyScheduleService.getUpcomingClasses(req.user.id, daysAhead);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching upcoming classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/schedule/weekly
// Get weekly schedule
router.get('/weekly', async (req, res) => {
  try {
    const result = await dailyScheduleService.getWeeklySchedule(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching weekly schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
