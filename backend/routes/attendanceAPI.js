/**
 * Comprehensive Attendance API Routes
 * Real-time, AI-powered attendance system endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const logger = require('../utils/logger');

// Import services
const qrTokenService = require('../services/qrTokenService');
const qrValidation = require('../middlewares/qrValidation');
const aiRiskScoringService = require('../services/aiRiskScoringService');
const smartNotificationService = require('../services/smartNotificationService');

/**
 * POST /api/attendance/session/:sessionId/start
 * Lecturer initiates attendance window for a class session
 * Generates QR token and broadcasts to all students
 */
router.post('/session/:sessionId/start', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const lecturerId = req.user.id;

    // Verify lecturer owns this session
    const [session] = await db.execute(
      `SELECT cs.* FROM class_sessions cs
       WHERE cs.id = ? AND cs.lecturer_id = ?`,
      [sessionId, lecturerId]
    );

    if (!session || session.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or does not belong to this lecturer'
      });
    }

    // Generate QR token
    const qrData = await qrTokenService.generateQRToken(
      sessionId,
      lecturerId,
      `${session[0].latitude},${session[0].longitude}`
    );

    // Update session to mark attendance as open
    await db.execute(
      `UPDATE class_sessions SET attendance_status = 'open', current_qr_token = ?, qr_expiry = ? WHERE id = ?`,
      [qrData.token, qrData.expiresAt, sessionId]
    );

    // Broadcast QR to all students in this session via Socket.IO
    if (global.io) {
      global.io.to(`session_${sessionId}`).emit('qr:refreshed', {
        qrToken: qrData.token,
        expiresAt: qrData.expiresAt,
        validitySeconds: qrData.validitySeconds,
        refreshInterval: qrData.refreshInterval
      });

      global.io.to(`session_${sessionId}`).emit('attendance:opened', {
        message: 'Attendance window is now open. Please scan the QR code displayed.',
        timestamp: new Date()
      });
    }

    // Send notifications to students
    await smartNotificationService.notifyAttendanceOpened(sessionId, lecturerId);

    logger.info(`Attendance started for session ${sessionId}`, { lecturerId });

    res.json({
      success: true,
      message: 'Attendance window opened',
      data: {
        sessionId,
        qrToken: qrData.token,
        expiresAt: qrData.expiresAt,
        validitySeconds: qrData.validitySeconds
      }
    });
  } catch (error) {
    logger.error('Error starting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start attendance',
      error: error.message
    });
  }
});

/**
 * POST /api/attendance/session/:sessionId/stop
 * Lecturer closes attendance window for a class session
 * Invalidates QR token and generates final summary
 */
router.post('/session/:sessionId/stop', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const lecturerId = req.user.id;

    // Verify lecturer owns this session
    const [session] = await db.execute(
      `SELECT cs.* FROM class_sessions cs
       WHERE cs.id = ? AND cs.lecturer_id = ?`,
      [sessionId, lecturerId]
    );

    if (!session || session.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or does not belong to this lecturer'
      });
    }

    // Invalidate QR token
    if (session[0].current_qr_token) {
      await qrTokenService.invalidateQRToken(sessionId, lecturerId);
    }

    // Get attendance summary
    const [summary] = await db.execute(
      `SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN risk_level IN ('minimal', 'low') THEN 1 END) as verified,
        COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as flagged,
        AVG(CAST(risk_score AS DECIMAL(5,2))) as avg_risk_score
       FROM attendance_scans
       WHERE class_session_id = ?`,
      [sessionId]
    );

    // Update session to mark attendance as closed
    await db.execute(
      `UPDATE class_sessions SET attendance_status = 'closed', current_qr_token = NULL, qr_expiry = NULL WHERE id = ?`,
      [sessionId]
    );

    // Broadcast closure to all students
    if (global.io) {
      global.io.to(`session_${sessionId}`).emit('attendance:closed', {
        message: 'Attendance window has closed.',
        summary: summary[0],
        timestamp: new Date()
      });
    }

    // Send notifications
    await smartNotificationService.notifyMissedAttendance(sessionId);
    await smartNotificationService.notifyLowAttendance(sessionId);

    logger.info(`Attendance stopped for session ${sessionId}`, { lecturerId });

    res.json({
      success: true,
      message: 'Attendance window closed',
      data: {
        sessionId,
        summary: summary[0]
      }
    });
  } catch (error) {
    logger.error('Error stopping attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop attendance',
      error: error.message
    });
  }
});

/**
 * POST /api/attendance/scan
 * Student submits QR code for attendance
 * Validates token, records scan, calculates risk score, generates alerts
 */
router.post('/scan', 
  authenticateToken,
  qrValidation.validateQRScan,
  qrValidation.verifyClassSession,
  qrValidation.scanAttemptLimiter, async (req, res) => {
    try {
      const { token, classSessionId, latitude, longitude } = req.body;
      const studentId = req.user.id;

      // Get client IP (handles proxies)
      const clientIp = qrValidation.getClientIP(req);
      
      // Generate device fingerprint
      const deviceFingerprint = qrValidation.generateDeviceFingerprint(req.headers['user-agent']);

      // Validate QR token
      const tokenValidation = await qrTokenService.validateQRToken(
        token,
        classSessionId,
        studentId,
        {
          latitude,
          longitude,
          ipAddress: clientIp,
          deviceHash: deviceFingerprint,
          userAgent: req.headers['user-agent']
        }
      );

      if (!tokenValidation.valid) {
        return res.status(401).json({
          success: false,
          message: tokenValidation.message,
          reason: tokenValidation.reason
        });
      }

      // Analyze student risk
      const riskAnalysis = await aiRiskScoringService.analyzeStudentRisk(
        studentId,
        classSessionId,
        {
          latitude,
          longitude,
          deviceHash: deviceFingerprint,
          ipAddress: clientIp,
          timestamp: new Date()
        }
      );

      // Record attendance scan
      const [scanResult] = await db.execute(
        `INSERT INTO attendance_scans 
         (class_session_id, student_id, scan_time, latitude, longitude, device_fingerprint, ip_address, risk_score, risk_level, status)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [classSessionId, studentId, latitude, longitude, deviceFingerprint, clientIp, riskAnalysis.score, riskAnalysis.level, 'verified']
      );

      // Store detailed risk analysis
      await db.execute(
        `INSERT INTO ai_risk_scores 
         (attendance_scan_id, student_id, class_session_id, device_risk, location_risk, network_risk, temporal_risk, anomaly_risk, overall_score, risk_level, recommendations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scanResult.insertId,
          studentId,
          classSessionId,
          riskAnalysis.factors.deviceRisk?.score || 0,
          riskAnalysis.factors.locationRisk?.score || 0,
          riskAnalysis.factors.networkRisk?.score || 0,
          riskAnalysis.factors.temporalRisk?.score || 0,
          riskAnalysis.factors.anomalyRisk?.score || 0,
          riskAnalysis.score,
          riskAnalysis.level,
          JSON.stringify(riskAnalysis.recommendations)
        ]
      );

      // Create audit log
      await db.execute(
        `INSERT INTO attendance_audit_logs 
         (student_id, class_session_id, action, event_data, created_at)
         VALUES (?, ?, 'qr_scan', ?, NOW())`,
        [
          studentId,
          classSessionId,
          JSON.stringify({
            qrTokenHash: tokenValidation.hash,
            riskScore: riskAnalysis.score,
            riskLevel: riskAnalysis.level,
            device: deviceFingerprint,
            location: { lat: latitude, lon: longitude }
          })
        ]
      );

      // Update session attendance count
      await db.execute(
        `UPDATE class_sessions SET attendance_count = attendance_count + 1 
         WHERE id = ?`,
        [classSessionId]
      );

      // Generate alert if high-risk
      if (riskAnalysis.level === 'high' || riskAnalysis.level === 'critical') {
        await db.execute(
          `INSERT INTO attendance_alerts 
           (student_id, class_session_id, alert_type, risk_score, risk_level, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
          [studentId, classSessionId, 'suspicious_activity', riskAnalysis.score, riskAnalysis.level]
        );

        // Notify lecturer of suspicious activity
        const [session] = await db.execute(
          `SELECT lecturer_id FROM class_sessions WHERE id = ?`,
          [classSessionId]
        );

        if (session.length > 0) {
          await smartNotificationService.notifySuspiciousActivity(
            classSessionId,
            studentId,
            riskAnalysis.score,
            riskAnalysis.level
          );
        }
      }

      // Emit real-time update to lecturer
      if (global.io) {
        global.io.to(`session_${classSessionId}`).emit('student:scanned', {
          studentId,
          timestamp: new Date(),
          riskLevel: riskAnalysis.level,
          riskScore: riskAnalysis.score
        });
      }

      res.json({
        success: true,
        message: 'Attendance recorded successfully',
        data: {
          studentId,
          classSessionId,
          timestamp: new Date(),
          riskScore: riskAnalysis.score,
          riskLevel: riskAnalysis.level,
          verified: true
        }
      });
    } catch (error) {
      logger.error('Attendance scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record attendance',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/attendance/session/:sessionId/qr
 * Lecturer retrieves current QR code for the session
 */
router.get('/session/:sessionId/qr', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const lecturerId = req.user.id;

    // Verify lecturer owns this session
    const [session] = await db.execute(
      `SELECT * FROM class_sessions WHERE id = ? AND lecturer_id = ?`,
      [sessionId, lecturerId]
    );

    if (session.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or does not belong to this lecturer'
      });
    }

    const sessionData = session[0];

    // Check if attendance window is open
    if (sessionData.attendance_status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Attendance window is not open for this session'
      });
    }

    // Get current QR token
    if (sessionData.current_qr_token) {
      res.json({
        success: true,
        data: {
          qrToken: sessionData.current_qr_token,
          expiresAt: sessionData.qr_expiry,
          sessionId,
          message: 'Current QR code for this session'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No active QR token for this session'
      });
    }
  } catch (error) {
    logger.error('Error retrieving QR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR code',
      error: error.message
    });
  }
});

/**
 * GET /api/attendance/session/:sessionId/status
 * Real-time attendance statistics
 */
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [stats] = await db.execute(
      `SELECT 
        cs.id,
        cs.class_id,
        cs.attendance_count as total_scanned,
        COUNT(DISTINCT CASE WHEN ars.risk_level = 'minimal' OR ars.risk_level = 'low' THEN cs.student_id END) as verified_count,
        COUNT(DISTINCT CASE WHEN ars.risk_level IN ('high', 'critical') THEN cs.student_id END) as flagged_count,
        AVG(ars.total_score) as avg_risk_score,
        MAX(ars.total_score) as max_risk_score,
        (SELECT COUNT(*) FROM class_enrollment WHERE class_id = cs.class_id) as enrolled_count
       FROM class_sessions cs
       LEFT JOIN attendance_scans att ON cs.id = att.class_session_id
       LEFT JOIN ai_risk_scores ars ON att.id = ars.attendance_scan_id
       WHERE cs.id = ?
       GROUP BY cs.id`,
      [sessionId]
    );

    if (stats.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const stat = stats[0];
    const attendanceRate = stat.enrolled_count > 0 
      ? ((stat.total_scanned / stat.enrolled_count) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        sessionId,
        totalScanned: stat.total_scanned,
        verifiedCount: stat.verified_count || 0,
        flaggedCount: stat.flagged_count || 0,
        enrolledCount: stat.enrolled_count,
        attendanceRate: parseFloat(attendanceRate),
        averageRiskScore: stat.avg_risk_score ? parseFloat(stat.avg_risk_score.toFixed(2)) : 0,
        maxRiskScore: stat.max_risk_score ? parseFloat(stat.max_risk_score.toFixed(2)) : 0
      }
    });
  } catch (error) {
    logger.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session status',
      error: error.message
    });
  }
});

/**
 * GET /api/attendance/history/:studentId
 * Student's attendance history with risk analysis
 */
router.get('/history/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Access control: students can only see their own history, admins can see anyone's
    if (requesterRole !== 'admin' && requesterId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [history] = await db.execute(
      `SELECT 
        att.id,
        att.class_session_id,
        cs.class_id,
        c.course_name,
        att.scan_time,
        att.latitude,
        att.longitude,
        att.risk_score,
        att.risk_level,
        ars.device_risk,
        ars.location_risk,
        ars.network_risk,
        ars.temporal_risk,
        ars.anomaly_risk,
        ars.recommendations
       FROM attendance_scans att
       JOIN class_sessions cs ON att.class_session_id = cs.id
       JOIN classes c ON cs.class_id = c.id
       LEFT JOIN ai_risk_scores ars ON att.id = ars.attendance_scan_id
       WHERE att.student_id = ?
       ORDER BY att.scan_time DESC
       LIMIT 50`,
      [studentId]
    );

    res.json({
      success: true,
      count: history.length,
      data: history.map(h => ({
        ...h,
        recommendations: h.recommendations ? JSON.parse(h.recommendations) : []
      }))
    });
  } catch (error) {
    logger.error('Error retrieving attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance history',
      error: error.message
    });
  }
});

/**
 * GET /api/attendance/insights/:classId
 * AI insights for lecturer (pattern analysis, flags)
 */
router.get('/insights/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const lecturerId = req.user.id;

    // Verify lecturer owns this class
    const [classCheck] = await db.execute(
      `SELECT id FROM classes WHERE id = ? AND lecturer_id = ?`,
      [classId, lecturerId]
    );

    if (classCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Class not found or does not belong to this lecturer'
      });
    }

    // Generate comprehensive insights
    const insights = await aiRiskScoringService.generateLecturerInsights(classId);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message
    });
  }
});

/**
 * GET /api/attendance/alerts
 * Admin alert management
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { severity, resolved } = req.query;

    let query = `SELECT 
      aa.id,
      aa.student_id,
      u.name as student_name,
      aa.class_session_id,
      c.course_name,
      aa.alert_type,
      aa.risk_score,
      aa.risk_level,
      aa.status,
      aa.created_at
     FROM attendance_alerts aa
     JOIN users u ON aa.student_id = u.id
     JOIN class_sessions cs ON aa.class_session_id = cs.id
     JOIN classes c ON cs.class_id = c.id
     WHERE 1=1`;

    const params = [];

    if (severity) {
      query += ` AND aa.risk_level = ?`;
      params.push(severity);
    }

    if (resolved !== undefined) {
      const status = resolved === 'true' ? 'resolved' : 'pending';
      query += ` AND aa.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY aa.created_at DESC LIMIT 100`;

    const [alerts] = await db.execute(query, params);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Error retrieving alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts',
      error: error.message
    });
  }
});

/**
 * PUT /api/attendance/alerts/:alertId/resolve
 * Resolve an alert (admin only)
 */
router.put('/alerts/:alertId/resolve', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution, notes } = req.body;

    await db.execute(
      `UPDATE attendance_alerts 
       SET status = 'resolved', resolution = ?, notes = ?, resolved_at = NOW(), resolved_by = ?
       WHERE id = ?`,
      [resolution || 'reviewed', notes || '', req.user.id, alertId]
    );

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
});

module.exports = router;
