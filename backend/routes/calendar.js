const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');


const calendarService = require('../services/calendarService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// POST /api/calendar/events
// Create event (admin only)
router.post(
  '/events', async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'lecturer') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const {
        title,
        event_type,
        class_id,
        start_date,
        end_date,
        start_time,
        end_time,
        location,
        description,
      } = req.body;

      const result = await calendarService.createEvent(
        title,
        event_type,
        start_date,
        end_date,
        start_time,
        end_time,
        location,
        description,
        class_id,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/calendar/events
// Get events for date range
router.get('/events', async (req, res) => {
  try {
    const { start_date, end_date, type, class_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'start_date and end_date required' });
    }

    const result = await calendarService.getEvents(start_date, end_date, type, class_id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/events/type/:type
// Get events by type
router.get('/events/type/:type', async (req, res) => {
  try {
    const result = await calendarService.getEventsByType(req.params.type);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching events by type:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/upcoming
// Get upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await calendarService.getUpcomingEvents(limit);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching upcoming events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/class/:classId
// Get class-specific events
router.get('/class/:classId', async (req, res) => {
  try {
    const result = await calendarService.getClassEvents(req.params.classId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching class events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/month/:year/:month
// Get month calendar
router.get('/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const result = await calendarService.getMonthCalendar(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching month calendar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/calendar/events/:id
// Update event (admin only)
router.put('/events/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'lecturer') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await calendarService.updateEvent(req.params.id, req.body);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/calendar/events/:id
// Delete event (admin only)
router.delete('/events/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'lecturer') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await calendarService.deleteEvent(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
