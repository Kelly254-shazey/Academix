const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateRequest } = require('../middlewares/validation');
const schemas = require('../validators/schemas');
const qrValidationService = require('../services/qrValidationService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// POST /api/qr/validate-and-checkin
// Validate QR and perform check-in
router.post(
  '/validate-and-checkin',
  validateRequest(schemas.qrValidationSchema),
  async (req, res) => {
    try {
      const { qr_token, latitude, longitude, device_fingerprint } = req.validatedData;

      const result = await qrValidationService.processQRCheckin(
        req.user.id,
        qr_token,
        latitude,
        longitude,
        device_fingerprint,
        req.body.device_name
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          statusCode: result.status,
        });
      }
    } catch (error) {
      logger.error('Error processing QR check-in:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get all QR sessions
router.get('/sessions', (req, res) => {
  try {
    // Sort by creation date (newest first)
    const sortedSessions = [...qrSessions].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Add expiration status
    const sessionsWithStatus = sortedSessions.map(session => ({
      ...session,
      isExpired: new Date() > new Date(session.expiresAt)
    }));

    res.json({
      success: true,
      sessions: sessionsWithStatus,
      count: sessionsWithStatus.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions'
    });
  }
});

// Get specific session by ID
router.get('/sessions/:id', (req, res) => {
  try {
    const session = qrSessions.find(s => s.id === req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const isExpired = new Date() > new Date(session.expiresAt);

    res.json({
      success: true,
      session: { ...session, isExpired }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching session'
    });
  }
});

// Scan QR Code (Student)
router.post('/scan', (req, res) => {
  try {
    const { sessionId, studentId, studentName } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and student ID are required'
      });
    }

    const session = qrSessions.find(s => s.id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'QR code has expired',
        error: 'expired'
      });
    }

    // Check if max scans reached
    if (session.scansCount >= session.maxScans) {
      return res.status(429).json({
        success: false,
        message: 'Maximum scans for this session reached',
        error: 'max_scans'
      });
    }

    // Check if student already scanned
    const alreadyScanned = session.studentScans.find(s => s.studentId === studentId);
    
    if (alreadyScanned) {
      return res.status(400).json({
        success: false,
        message: 'You have already scanned this QR code',
        error: 'duplicate_scan'
      });
    }

    // Record the scan
    const scan = {
      studentId,
      studentName: studentName || 'Unknown',
      scannedAt: new Date().toISOString(),
      ipAddress: req.ip
    };

    session.studentScans.push(scan);
    session.scansCount += 1;

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      session: {
        id: session.id,
        courseName: session.courseName,
        lectureId: session.lectureId,
        scansCount: session.scansCount,
        maxScans: session.maxScans
      }
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing QR scan'
    });
  }
});

// End QR session (Lecturer)
router.post('/sessions/:id/end', (req, res) => {
  try {
    const session = qrSessions.find(s => s.id === req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.status = 'ended';
    session.endedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Session ended successfully',
      session
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending session'
    });
  }
});

// Get session attendance report
router.get('/sessions/:id/report', (req, res) => {
  try {
    const session = qrSessions.find(s => s.id === req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const report = {
      sessionId: session.id,
      courseName: session.courseName,
      lectureId: session.lectureId,
      createdAt: session.createdAt,
      endedAt: session.endedAt || null,
      totalScans: session.scansCount,
      maxScans: session.maxScans,
      expirationTime: session.expirationMinutes,
      studentAttendance: session.studentScans.map((scan, index) => ({
        position: index + 1,
        studentId: scan.studentId,
        studentName: scan.studentName,
        scannedAt: scan.scannedAt
      }))
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Delete QR session
router.delete('/sessions/:id', (req, res) => {
  try {
    const index = qrSessions.findIndex(s => s.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const deletedSession = qrSessions.splice(index, 1);

    res.json({
      success: true,
      message: 'Session deleted successfully',
      session: deletedSession[0]
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting session'
    });
  }
});

module.exports = router;
