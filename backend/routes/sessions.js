const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const qrGenerationService = require('../services/qrGenerationService');
const db = require('../database');

// All routes require authentication and lecturer role
router.use(authenticateToken);


/**
 * GET /sessions/lecturer/upcoming
 * Get upcoming sessions for the current lecturer
 */
router.get('/lecturer/upcoming', async (req, res) => {
  try {
    const [sessions] = await db.execute(`
      SELECT
        cs.id,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.qr_expires_at,
        c.course_code,
        c.course_name,
        c.day_of_week
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE c.lecturer_id = ?
        AND cs.session_date >= CURDATE()
        AND cs.session_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY cs.session_date, cs.start_time
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Upcoming sessions retrieved successfully',
      data: sessions || []
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /sessions/:sessionId/generate-qr
 * Generate QR code for a specific session
 */
router.post('/:sessionId/generate-qr', async (req, res) => {
  try {
    // First verify the session belongs to the lecturer
    const [sessionCheck] = await db.execute(`
      SELECT cs.id, c.id as class_id, c.lecturer_id
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = ? AND c.lecturer_id = ?
    `, [req.params.sessionId, req.user.id]);

    if (sessionCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Session not found or does not belong to you.'
      });
    }

    // Generate QR code
    const result = await qrGenerationService.generateQR(
      sessionCheck[0].class_id,
      req.params.sessionId,
      req.user.id
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'QR code generated successfully',
        data: {
          token: result.token,
          qrCodeUrl: result.qrCodeUrl,
          expiresAt: result.expiresAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to generate QR code'
      });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;