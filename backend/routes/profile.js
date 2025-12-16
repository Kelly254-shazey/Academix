const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validateProfileUpdate } = require('../middlewares/validation');
const studentProfileService = require('../services/studentProfileService');
const lecturerProfileService = require('../services/lecturerProfileService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.user.role === 'lecturer') {
      result = await lecturerProfileService.getProfile(req.user.id);
    } else {
      result = await studentProfileService.getProfile(req.user.id);
    }

    res.json({
      success: true,
      profile: result,
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/profile
router.put('/', validateProfileUpdate, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'lecturer') {
      result = await lecturerProfileService.updateProfile(req.user.id, req.body);
    } else {
      result = await studentProfileService.updateProfile(req.user.id, req.body);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/profile/avatar
router.put('/avatar', async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ success: false, message: 'Avatar URL required' });
    }

    const result = await studentProfileService.updateAvatar(req.user.id, avatarUrl);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating avatar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;