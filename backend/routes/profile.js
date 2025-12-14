const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateRequest } = require('../middlewares/validation');
const schemas = require('../validators/schemas');
const studentProfileService = require('../services/studentProfileService');
const lecturerProfileService = require('../services/lecturerProfileService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// GET /api/profile
// Get profile (student or lecturer based on role)
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

// GET /api/profile/student
// Get student profile explicitly
router.get('/student', async (req, res) => {
  try {
    const result = await studentProfileService.getProfile(req.user.id);
    res.json({
      success: true,
      profile: result,
    });
  } catch (error) {
    logger.error('Error fetching student profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/profile
// Update profile (student or lecturer based on role)
router.put(
  '/',
  validateRequest(schemas.updateProfileSchema),
  async (req, res) => {
    try {
      let result;
      if (req.user.role === 'lecturer') {
        result = await lecturerProfileService.updateProfile(req.user.id, req.validatedData);
      } else {
        result = await studentProfileService.updateProfile(req.user.id, req.validatedData);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/profile/student
// Update student profile explicitly
router.put(
  '/student',
  validateRequest(schemas.updateProfileSchema),
  async (req, res) => {
    try {
      const result = await studentProfileService.updateProfile(req.user.id, req.validatedData);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error updating student profile:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/profile/avatar
// Update avatar
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

// GET /api/profile/devices
// Get verified devices
router.get('/devices', async (req, res) => {
  try {
    const result = await studentProfileService.getVerifiedDevices(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching devices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/profile/devices
// Register new device
router.post(
  '/devices',
  validateRequest(schemas.deviceManagementSchema),
  async (req, res) => {
    try {
      const { device_fingerprint, device_name } = req.validatedData;
      const result = await studentProfileService.registerDevice(
        req.user.id,
        device_fingerprint,
        device_name
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error registering device:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/profile/devices/:id
// Remove device
router.delete('/devices/:id', async (req, res) => {
  try {
    const result = await studentProfileService.removeDevice(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error removing device:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/profile/completion
// Get profile completion percentage
router.get('/completion', async (req, res) => {
  try {
    const completion = await studentProfileService.getProfileCompletion(req.user.id);
    res.json({
      success: true,
      profileCompletion: completion,
    });
  } catch (error) {
    logger.error('Error getting profile completion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
