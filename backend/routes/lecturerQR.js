// lecturerQR.js
// Lecturer QR Management Routes
// POST /api/lecturer/checkin - Lecturer QR check-in
// POST /api/classes/:classId/sessions/:sessionId/qr - Generate QR code
// POST /api/classes/:classId/sessions/:sessionId/qr/rotate - Rotate QR code
// POST /api/classes/:classId/sessions/:sessionId/qr/validate - Validate QR code
// GET /api/classes/:classId/sessions/:sessionId/qr - Get active QR
// GET /api/classes/:classId/sessions/:sessionId/qr/history - Get QR history
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router({ mergeParams: true });
const qrGenerationService = require('../services/qrGenerationService');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  lecturerQRCheckinSchema,
  qrGenerationSchema,
  qrValidationSchema,
} = require('../validators/lecturerSchemas');
const logger = require('../utils/logger');

// Middleware: Verify lecturer role
const isLecturer = (req, res, next) => {
  if (req.user.role !== 'lecturer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Lecturer role required.',
    });
  }
  next();
};

/**
 * POST /api/lecturer/checkin
 * Lecturer QR check-in for authentication
 */
router.post('/checkin', authMiddleware, isLecturer, async (req, res) => {
  try {
    const { error, value } = lecturerQRCheckinSchema.validate(req.body);

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
      qrToken,
      signature,
      deviceId,
      deviceFingerprint,
    } = value;

    // Validate QR token
    const validation = await qrGenerationService.validateQRToken(
      qrToken,
      signature,
      sessionId,
      classId
    );

    if (!validation.data.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR token',
        reason: validation.data.reason,
      });
    }

    // Update lecturer device fingerprint (for future security)
    // This would register the device in lecturer_devices table
    // For now, we just acknowledge successful check-in

    logger.info(
      `Lecturer ${req.user.id} checked in to session ${sessionId}`
    );

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: {
        sessionId,
        classId,
        lecturerId: req.user.id,
        checkedInAt: new Date().toISOString(),
        qrId: validation.data.qrId,
      },
    });
  } catch (error) {
    logger.error('Error in lecturer check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/classes/:classId/sessions/:sessionId/qr
 * Generate new QR code for session
 */
router.post(
  '/:classId/sessions/:sessionId/qr',
  authMiddleware,
  isLecturer,
  async (req, res) => {
    try {
      const { error, value } = qrGenerationSchema.validate({
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

      const { classId, sessionId, validityMinutes } = value;
      const lecturerId = req.user.id;

      const options = validityMinutes ? { validityMinutes } : {};

      const result = await qrGenerationService.generateQR(
        classId,
        sessionId,
        lecturerId,
        options
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Failed to generate QR',
        });
      }

      res.status(201).json({
        success: true,
        message: 'QR code generated successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error generating QR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/qr/rotate
 * Rotate QR code (invalidate current, generate new)
 */
router.post(
  '/:classId/sessions/:sessionId/qr/rotate',
  authMiddleware,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;
      const lecturerId = req.user.id;

      const result = await qrGenerationService.rotateQR(
        parseInt(classId),
        parseInt(sessionId),
        lecturerId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Failed to rotate QR',
        });
      }

      res.status(200).json({
        success: true,
        message: 'QR code rotated successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error rotating QR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rotate QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/qr/validate
 * Validate a QR token
 */
router.post(
  '/:classId/sessions/:sessionId/qr/validate',
  authMiddleware,
  async (req, res) => {
    try {
      const { error, value } = qrValidationSchema.validate({
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

      const { classId, sessionId, qrToken, signature } = value;

      const validation = await qrGenerationService.validateQRToken(
        qrToken,
        signature,
        sessionId,
        classId
      );

      res.status(200).json({
        success: true,
        data: {
          valid: validation.data.valid,
          reason: validation.data.reason,
          qrId: validation.data.qrId,
        },
      });
    } catch (error) {
      logger.error('Error validating QR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/sessions/:sessionId/qr
 * Get active QR code for session
 */
router.get(
  '/:classId/sessions/:sessionId/qr',
  authMiddleware,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;

      const result = await qrGenerationService.getActiveQR(
        parseInt(classId),
        parseInt(sessionId)
      );

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'No active QR code found',
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Error fetching active QR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/sessions/:sessionId/qr/history
 * Get QR code history for session
 */
router.get(
  '/:classId/sessions/:sessionId/qr/history',
  authMiddleware,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const result = await qrGenerationService.getQRHistory(
        parseInt(classId),
        parseInt(sessionId),
        limit
      );

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.data ? result.data.length : 0,
      });
    } catch (error) {
      logger.error('Error fetching QR history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch QR history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
