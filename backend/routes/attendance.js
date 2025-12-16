const express = require('express');
const router = express.Router();
const lecturerService = require('../services/lecturerService');

// POST: Start attendance session
router.post('/session/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await lecturerService.startClassSession('lecturer_1', sessionId);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance session started',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
});

// POST: Stop attendance session
router.post('/session/:sessionId/stop', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await lecturerService.stopClassSession('lecturer_1', sessionId);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance session stopped',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop session',
      error: error.message
    });
  }
});

// GET: Get QR code for session
router.get('/session/:sessionId/qr', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await lecturerService.getSessionQR(sessionId);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(200).json(result.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get QR code',
      error: error.message
    });
  }
});

// POST: Scan QR code (student attendance)
router.post('/scan', async (req, res) => {
  try {
    const { qrToken, latitude, longitude, deviceId } = req.body;
    
    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: 'QR token is required'
      });
    }
    
    // Validate QR code
    const validation = lecturerService.validateQRCode(qrToken);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const { sessionId } = validation;
    const studentId = `student_${Date.now()}`;
    
    const result = await lecturerService.recordAttendance(sessionId, studentId, 'present');
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        studentId,
        sessionId,
        status: 'present',
        timestamp: new Date().toISOString(),
        className: validation.session.className
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
});

// GET: Get session status
router.get('/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = lecturerService.activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        sessionId,
        status: session.status,
        presentCount: session.presentCount || 0,
        absentCount: session.absentCount || 0,
        startTime: session.startTime,
        className: session.className
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: error.message
    });
  }
});

module.exports = router;