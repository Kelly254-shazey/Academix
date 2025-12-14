/**
 * QR Validation Middleware
 * Real-time QR token verification with device fingerprinting and geo-location checks
 */

const crypto = require('crypto');
const db = require('../database');
const logger = require('../utils/logger');
const qrTokenService = require('../services/qrTokenService');

/**
 * Generate device fingerprint from request headers and user agent
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';
  
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress
  );
}

/**
 * Middleware: Validate QR attendance scan
 * Usage: router.post('/attendance/scan', validateQRScan, scanHandler)
 */
async function validateQRScan(req, res, next) {
  try {
    const { token, classSessionId, latitude, longitude } = req.body;
    const studentId = req.user.id;

    // Validate request payload
    if (!token || !classSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing token or sessionId',
        code: 'INVALID_REQUEST'
      });
    }

    // Build scan context
    const scanContext = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ipAddress: getClientIP(req),
      deviceHash: generateDeviceFingerprint(req),
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };

    // Validate QR token
    const validation = await qrTokenService.validateQRToken(
      token,
      classSessionId,
      studentId,
      scanContext
    );

    // Return validation result
    if (!validation.valid) {
      logger.warn(`QR validation failed for student ${studentId}`, {
        reason: validation.reason,
        sessionId: classSessionId
      });

      return res.status(validation.riskScore === 100 ? 401 : 403).json({
        success: false,
        message: validation.message,
        code: validation.reason,
        riskScore: validation.riskScore
      });
    }

    // Attach validation data to request for next middleware
    req.attendance = {
      studentId,
      classSessionId,
      lecturerId: validation.lecturerId,
      riskScore: validation.riskScore,
      flagged: validation.flagged,
      scanContext
    };

    logger.info(`QR scan validated for student ${studentId}`, {
      sessionId: classSessionId,
      riskScore: validation.riskScore
    });

    next();
  } catch (error) {
    logger.error('Error in QR validation middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR'
    });
  }
}

/**
 * Middleware: Verify student is in valid class session
 */
async function verifyClassSession(req, res, next) {
  try {
    const { classSessionId } = req.body;
    const studentId = req.user.id;

    // Check if session exists and is active
    const [session] = await db.execute(
      `SELECT cs.* FROM class_sessions cs
       WHERE cs.id = ? AND cs.status = 'active'
       AND cs.start_time <= NOW() AND cs.end_time >= NOW()`,
      [classSessionId]
    );

    if (!session || session.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Class session is not active',
        code: 'INVALID_SESSION'
      });
    }

    // Check if student is enrolled in this class
    const [enrollment] = await db.execute(
      `SELECT * FROM class_enrollment ce
       WHERE ce.class_id = ? AND ce.student_id = ?`,
      [session[0].class_id, studentId]
    );

    if (!enrollment || enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class',
        code: 'NOT_ENROLLED'
      });
    }

    // Check if student already has attendance for this session
    const [existing] = await db.execute(
      `SELECT * FROM attendance_scans 
       WHERE class_session_id = ? AND student_id = ? AND status = 'verified'`,
      [classSessionId, studentId]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already marked attendance for this session',
        code: 'DUPLICATE_ATTENDANCE'
      });
    }

    next();
  } catch (error) {
    logger.error('Error verifying class session:', error);
    res.status(500).json({
      success: false,
      message: 'Session verification error'
    });
  }
}

/**
 * Rate limiting for QR scan attempts
 * Prevent brute force attacks
 */
const scanAttemptLimiter = (() => {
  const attempts = new Map();
  
  return async (req, res, next) => {
    try {
      const studentId = req.user.id;
      const now = Date.now();
      const key = `scan_attempt:${studentId}`;

      if (!attempts.has(key)) {
        attempts.set(key, []);
      }

      const studentAttempts = attempts.get(key);
      
      // Remove attempts older than 1 minute
      const recentAttempts = studentAttempts.filter(
        timestamp => now - timestamp < 60000
      );

      // Limit to 10 attempts per minute
      if (recentAttempts.length >= 10) {
        logger.warn(`Rate limit exceeded for student ${studentId}`);
        return res.status(429).json({
          success: false,
          message: 'Too many scan attempts. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        });
      }

      recentAttempts.push(now);
      attempts.set(key, recentAttempts);

      next();
    } catch (error) {
      logger.error('Error in rate limiter:', error);
      next(); // Allow request to proceed if rate limiter fails
    }
  };
})();

module.exports = {
  validateQRScan,
  verifyClassSession,
  scanAttemptLimiter,
  generateDeviceFingerprint,
  getClientIP
};
module.exports.default = module.exports;
