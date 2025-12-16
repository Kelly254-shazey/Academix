const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');


const userSettingsService = require('../services/userSettingsService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/settings
// Get user settings
router.get('/', async (req, res) => {
  try {
    const result = await userSettingsService.getSettings(req.user.id);
    res.json({
      success: true,
      settings: result,
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings/student
// Get student settings explicitly
router.get('/student', async (req, res) => {
  try {
    const result = await userSettingsService.getSettings(req.user.id);
    res.json({
      success: true,
      settings: result,
    });
  } catch (error) {
    logger.error('Error fetching student settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings
// Update user settings
router.put(
  '/', async (req, res) => {
    try {
      const result = await userSettingsService.updateSettings(req.user.id, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/settings/student
// Update student settings explicitly
router.put(
  '/student', async (req, res) => {
    try {
      const result = await userSettingsService.updateSettings(req.user.id, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error updating student settings:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/settings/change-password
// Change password
router.post(
  '/change-password', async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      const result = await userSettingsService.changePassword(
        req.user.id,
        current_password,
        new_password
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/settings/sessions
// Get active sessions
router.get('/sessions', async (req, res) => {
  try {
    const result = await userSettingsService.getActiveSessions(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/logout-other-sessions
// Logout all other sessions
router.post('/logout-other-sessions', async (req, res) => {
  try {
    const sessionId = req.body.currentSessionId || req.sessionId;
    const result = await userSettingsService.logoutOtherSessions(req.user.id, sessionId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error logging out other sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/settings/sessions/:id
// Revoke specific session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const result = await userSettingsService.revokeSession(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error revoking session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
