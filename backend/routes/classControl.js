// classControl.js
// Class Session Control API Routes
// POST /api/classes/:classId/sessions/:sessionId/start - Start a session
// POST /api/classes/:classId/sessions/:sessionId/delay - Delay a session
// POST /api/classes/:classId/sessions/:sessionId/cancel - Cancel a session
// POST /api/classes/:classId/sessions/:sessionId/room-change - Change room
// POST /api/classes/:classId/sessions/:sessionId/scanning - Toggle scanning
// GET /api/classes/:classId/sessions/:sessionId/state - Get session state
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router({ mergeParams: true });
const classSessionService = require('../services/classSessionService');
const classService = require('../services/classService');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  sessionStartSchema,
  sessionDelaySchema,
  sessionCancelSchema,
  roomChangeSchema,
  toggleScanningSchema,
} = require('../validators/lecturerSchemas');
const logger = require('../utils/logger');

// Middleware: Verify lecturer ownership and role
const validateLecturerAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'lecturer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Lecturer role required.',
      });
    }

    // Verify lecturer teaches this class
    // This would check in classService if lecturer_id matches
    // For now, we'll assume all lecturers can manage sessions
    next();
  } catch (error) {
    logger.error('Access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Access validation failed',
    });
  }
};

/**
 * POST /api/classes/:classId/sessions/:sessionId/start
 * Start a class session
 */
router.post(
  '/:classId/sessions/:sessionId/start',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { error, value } = sessionStartSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const { classId, sessionId, deviceId, deviceFingerprint } = value;
      const lecturerId = req.user.id;

      const result = await classSessionService.startSession(
        classId,
        sessionId,
        lecturerId,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Session started successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error starting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/delay
 * Delay a class session
 */
router.post(
  '/:classId/sessions/:sessionId/delay',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { error, value } = sessionDelaySchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        delayMinutes,
        reason,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await classSessionService.delaySession(
        classId,
        sessionId,
        lecturerId,
        delayMinutes,
        reason,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Session delayed successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error delaying session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delay session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/cancel
 * Cancel a class session
 */
router.post(
  '/:classId/sessions/:sessionId/cancel',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { error, value } = sessionCancelSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        reason,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await classSessionService.cancelSession(
        classId,
        sessionId,
        lecturerId,
        reason,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Session cancelled successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error cancelling session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/room-change
 * Change session room
 */
router.post(
  '/:classId/sessions/:sessionId/room-change',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { error, value } = roomChangeSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        newRoom,
        reason,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      // Get old room
      const sessionState = await classSessionService.getSessionState(
        classId,
        sessionId
      );
      const oldRoom = sessionState.data.room;

      const result = await classSessionService.changeRoom(
        classId,
        sessionId,
        lecturerId,
        newRoom,
        oldRoom,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Room changed successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error changing room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change room',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/scanning
 * Toggle QR scanning on/off
 */
router.post(
  '/:classId/sessions/:sessionId/scanning',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { error, value } = toggleScanningSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const { classId, sessionId, enabled, deviceId, deviceFingerprint } =
        value;
      const lecturerId = req.user.id;

      const result = await classSessionService.toggleScanning(
        classId,
        sessionId,
        lecturerId,
        enabled,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: `Scanning ${enabled ? 'enabled' : 'disabled'} successfully`,
        data: result.data,
      });
    } catch (error) {
      logger.error('Error toggling scanning:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle scanning',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/sessions/:sessionId/state
 * Get current session state
 */
router.get(
  '/:classId/sessions/:sessionId/state',
  authenticateToken,
  validateLecturerAccess,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;

      const result = await classSessionService.getSessionState(
        parseInt(classId),
        parseInt(sessionId)
      );

      res.status(200).json({
        success: result.success,
        data: result.data,
      });
    } catch (error) {
      logger.error('Error fetching session state:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session state',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
