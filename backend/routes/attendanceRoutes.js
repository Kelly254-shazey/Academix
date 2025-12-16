/**
 * Real-Time Attendance API Routes
 * Implements secure QR scanning, validation, and AI-powered risk assessment
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { 
  validateQRScan, 
  verifyClassSession, 
  scanAttemptLimiter,
  generateDeviceFingerprint,
  getClientIP
} = require('../middlewares/qrValidation');
const qrTokenService = require('../services/qrTokenService');
const aiRiskScoringService = require('../services/aiRiskScoringService');
const db = require('../database');
const logger = require('../utils/logger');

/**
 * POST /api/attendance/scan
 * Student scans QR code for attendance
 */
router.post(
  '/scan',
  authenticateToken,
  scanAttemptLimiter,
  validateQRScan,
  verifyClassSession, async (req, res) => {
    try {
      const studentId = req.user.id;
      const { classSessionId, latitude, longitude } = req.body;
      const { attendance, scanContext } = req;

      // Calculate AI risk score
      const riskAnalysis = await aiRiskScoringService.analyzeStudentRisk(
        studentId,
        classSessionId,
        scanContext
      );

      // Update risk score in database
      await db.execute(
        `UPDATE attendance_scans SET risk_score = ? WHERE class_session_id = ? AND student_id = ? AND status = 'verified'`,
        [riskAnalysis.riskScore, classSessionId, studentId]
      );

      // Create risk score record
      const [scan] = await db.execute(
        `SELECT id FROM attendance_scans WHERE class_session_id = ? AND student_id = ? LIMIT 1`,
        [classSessionId, studentId]
      );

      if (scan && scan.length > 0) {
        await db.execute(
          `INSERT INTO ai_risk_scores 
           (student_id, class_session_id, attendance_scan_id, overall_score, risk_level, 
            device_risk, location_risk, network_risk, temporal_risk, anomaly_risk, flags, recommendations)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            classSessionId,
            scan[0].id,
            riskAnalysis.riskScore,
            riskAnalysis.riskLevel,
            riskAnalysis.factors.deviceRisk?.score || 0,
            riskAnalysis.factors.locationRisk?.score || 0,
            riskAnalysis.factors.networkRisk?.score || 0,
            riskAnalysis.factors.temporalRisk?.score || 0,
            riskAnalysis.factors.anomalyRisk?.score || 0,
            JSON.stringify(riskAnalysis.factors),
            JSON.stringify(riskAnalysis.recommendations)
          ]
        );
      }

      // If risk is high, create an alert
      if (riskAnalysis.riskLevel === 'high' || riskAnalysis.riskLevel === 'critical') {
        await db.execute(
          `INSERT INTO attendance_alerts 
           (student_id, class_session_id, alert_type, severity, description)
           VALUES (?, ?, 'suspicious_activity', ?, ?)`,
          [
            studentId,
            classSessionId,
            riskAnalysis.riskLevel === 'critical' ? 'critical' : 'high',
            `Risk score: ${riskAnalysis.riskScore}/100. Flags: ${riskAnalysis.recommendations.join(', ')}`
          ]
        );
      }

      // Log audit event
      await db.execute(
        `INSERT INTO attendance_audit_logs 
         (student_id, event_type, class_session_id, event_data, ip_address, device_hash)
         VALUES (?, 'attendance_scan', ?, ?, ?, ?)`,
        [
          studentId,
          classSessionId,
          JSON.stringify({
            riskScore: riskAnalysis.riskScore,
            riskLevel: riskAnalysis.riskLevel,
            location: { latitude, longitude },
            timestamp: new Date().toISOString()
          }),
          scanContext.ipAddress,
          scanContext.deviceHash
        ]
      );

      // Update class session attendance count
      await db.execute(
        `UPDATE class_sessions SET attendance_count = attendance_count + 1 WHERE id = ?`,
        [classSessionId]
      );

      logger.info(`Attendance marked for student ${studentId}`, {
        sessionId: classSessionId,
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance marked successfully',
        data: {
          sessionId: classSessionId,
          studentId,
          timestamp: new Date().toISOString(),
          riskAssessment: {
            score: riskAnalysis.riskScore,
            level: riskAnalysis.riskLevel,
            flagged: riskAnalysis.riskLevel !== 'minimal' && riskAnalysis.riskLevel !== 'low'
          }
        }
      });
    } catch (error) {
      logger.error('Error marking attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking attendance',
        code: 'ATTENDANCE_ERROR'
      });
    }
  }
);

/**
 * GET /api/attendance/session/:sessionId/qr
 * Get current QR token for a session (Lecturer only)
 */
router.get('/session/:sessionId/qr', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const lecturerId = req.user.id;

    // Verify lecturer
    const [session] = await db.execute(
      `SELECT * FROM class_sessions WHERE id = ? AND lecturer_id = ?`,
      [sessionId, lecturerId]
    );

    if (!session || session.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!session[0].qr_active) {
      return res.status(400).json({
        success: false,
        message: 'QR is not active for this session'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        qrToken: session[0].current_qr_token,
        active: session[0].qr_active
      }
    });
  } catch (error) {
    logger.error('Error fetching QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching QR'
    });
  }
});

/**
 * GET /api/attendance/session/:sessionId/status
 * Get real-time attendance status for a session
 */
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify access (lecturer or admin)
    const [session] = await db.execute(
      `SELECT cs.* FROM class_sessions cs
       WHERE cs.id = ? AND (cs.lecturer_id = ? OR ? IN (SELECT id FROM users WHERE role IN ('admin', 'superadmin')))`,
      [sessionId, userId, userId]
    );

    if (!session || session.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Get attendance statistics
    const [attendance] = await db.execute(
      `SELECT 
        COUNT(*) as total_scans,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged,
        SUM(CASE WHEN risk_score > 60 THEN 1 ELSE 0 END) as high_risk,
        AVG(risk_score) as avg_risk_score,
        MAX(risk_score) as max_risk_score
       FROM attendance_scans WHERE class_session_id = ?`,
      [sessionId]
    );

    // Get enrolled student count
    const [enrollment] = await db.execute(
      `SELECT COUNT(*) as enrolled
       FROM class_enrollment ce
       WHERE ce.class_id = (SELECT class_id FROM class_sessions WHERE id = ?)`,
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        sessionId,
        session: session[0],
        attendance: {
          ...(attendance?.[0] || {}),
          enrolled: enrollment?.[0]?.enrolled || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching attendance status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching status'
    });
  }
});

/**
 * GET /api/attendance/history/:studentId
 * Get student's attendance history with risk analysis
 */
router.get('/history/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;

    // Verify access (own history or admin)
    if (userId !== parseInt(studentId) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const [history] = await db.execute(
      `SELECT 
        ash.id,
        ash.class_session_id,
        c.course_name,
        cs.start_time,
        ash.scan_time,
        ash.risk_score,
        ash.status,
        ars.risk_level,
        ars.overall_score
       FROM attendance_scans ash
       JOIN class_sessions cs ON ash.class_session_id = cs.id
       JOIN classes c ON cs.class_id = c.id
       LEFT JOIN ai_risk_scores ars ON ash.id = ars.attendance_scan_id
       WHERE ash.student_id = ?
       ORDER BY ash.scan_time DESC
       LIMIT 50`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        studentId,
        history: history || []
      }
    });
  } catch (error) {
    logger.error('Error fetching attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history'
    });
  }
});

/**
 * GET /api/attendance/insights/:classId
 * Get AI insights for a class (Lecturer/Admin only)
 */
router.get('/insights/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    // Verify access
    const [classData] = await db.execute(
      `SELECT * FROM classes 
       WHERE id = ? AND (lecturer_id = ? OR ? IN (SELECT id FROM users WHERE role IN ('admin', 'superadmin')))`,
      [classId, userId, userId]
    );

    if (!classData || classData.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const insights = await aiRiskScoringService.generateLecturerInsights(userId, classId);

    res.json({
      success: true,
      data: {
        classId,
        insights
      }
    });
  } catch (error) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insights'
    });
  }
});

/**
 * GET /api/attendance/alerts
 * Get attendance alerts for admin review
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    // Admin/Superadmin only
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { severity, resolved } = req.query;
    let query = `SELECT * FROM attendance_alerts WHERE 1=1`;
    const params = [];

    if (severity) {
      query += ` AND severity = ?`;
      params.push(severity);
    }

    if (resolved !== undefined) {
      query += ` AND resolved = ?`;
      params.push(resolved === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const [alerts] = await db.execute(query, params);

    res.json({
      success: true,
      data: {
        alerts: alerts || []
      }
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts'
    });
  }
});

module.exports = router;
