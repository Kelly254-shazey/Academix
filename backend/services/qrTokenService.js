/**
 * QR Token Service
 * Generates and manages time-bound, cryptographically secure QR codes
 * - 20-30 second validity
 * - JWT-based tokens with session binding
 * - Single-use enforcement
 * - Redis-backed expiry
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const QR_VALIDITY_SECONDS = 25; // Token validity window
const QR_REFRESH_INTERVAL = 20000; // Refresh every 20 seconds (milliseconds)

class QRTokenService {
  /**
   * Generate a time-bound QR token for a class session
   * @param {number} classSessionId - Session ID
   * @param {number} lecturerId - Lecturer ID
   * @param {string} classroomCoords - JSON string of {latitude, longitude}
   * @returns {Promise<Object>} Token and metadata
   */
  async generateQRToken(classSessionId, lecturerId, classroomCoords) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + QR_VALIDITY_SECONDS * 1000);

      // Generate cryptographically secure nonce
      const nonce = crypto.randomBytes(16).toString('hex');

      // Create JWT token with session context
      const tokenPayload = {
        sessionId: classSessionId,
        lecturerId: lecturerId,
        nonce: nonce,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        type: 'qr_attendance'
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: `${QR_VALIDITY_SECONDS}s`
      });

      // Store token in Redis with expiry
      const redisKey = `qr_token:${classSessionId}:${lecturerId}`;
      await redis.setex(
        redisKey,
        QR_VALIDITY_SECONDS,
        JSON.stringify({
          token,
          nonce,
          issuedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          used: false,
          usedBy: [],
          classroomCoords
        })
      );

      // Store in database for audit trail
      await db.execute(
        `INSERT INTO qr_tokens 
         (class_session_id, lecturer_id, token_hash, issued_at, expires_at, nonce, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          classSessionId,
          lecturerId,
          this._hashToken(token),
          now,
          expiresAt,
          nonce
        ]
      );

      logger.info(`QR token generated for session ${classSessionId}`, {
        sessionId: classSessionId,
        expiresIn: `${QR_VALIDITY_SECONDS}s`
      });

      return {
        token,
        expiresAt: expiresAt.toISOString(),
        validitySeconds: QR_VALIDITY_SECONDS,
        refreshInterval: QR_REFRESH_INTERVAL,
        sessionId: classSessionId,
        nonce
      };
    } catch (error) {
      logger.error('Error generating QR token:', error);
      throw error;
    }
  }

  /**
   * Validate QR token and prevent reuse
   * @param {string} token - JWT token from QR scan
   * @param {number} classSessionId - Expected session ID
   * @param {number} studentId - Student scanning
   * @param {Object} scanContext - {latitude, longitude, ipAddress, deviceHash, userAgent}
   * @returns {Promise<Object>} Validation result with risk score
   */
  async validateQRToken(token, classSessionId, studentId, scanContext = {}) {
    try {
      // Verify JWT signature and expiry
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256']
        });
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return {
            valid: false,
            reason: 'QR_EXPIRED',
            message: 'QR code has expired',
            riskScore: 100
          };
        }
        return {
          valid: false,
          reason: 'INVALID_TOKEN',
          message: 'Invalid or tampered QR token',
          riskScore: 100
        };
      }

      // Check if token's sessionId matches
      if (decoded.sessionId !== classSessionId) {
        return {
          valid: false,
          reason: 'SESSION_MISMATCH',
          message: 'QR token does not match this session',
          riskScore: 95
        };
      }

      // Get token from Redis
      const redisKey = `qr_token:${classSessionId}:${decoded.lecturerId}`;
      const storedToken = await redis.get(redisKey);

      if (!storedToken) {
        return {
          valid: false,
          reason: 'QR_EXPIRED',
          message: 'QR code has expired or been invalidated',
          riskScore: 100
        };
      }

      const tokenData = JSON.parse(storedToken);

      // Check for reuse
      if (tokenData.used && tokenData.usedBy.includes(studentId)) {
        logger.warn(`Attempted QR reuse by student ${studentId} for session ${classSessionId}`);
        return {
          valid: false,
          reason: 'QR_ALREADY_USED',
          message: 'You have already scanned for this session',
          riskScore: 100
        };
      }

      // Validate classroom coordinates and distance
      if (tokenData.classroomCoords && scanContext.latitude && scanContext.longitude) {
        const classCoords = JSON.parse(tokenData.classroomCoords);
        const distance = this._calculateDistance(
          classCoords.latitude,
          classCoords.longitude,
          scanContext.latitude,
          scanContext.longitude
        );

        const maxAllowedDistance = 50; // meters
        if (distance > maxAllowedDistance) {
          logger.warn(`Out-of-range scan attempt by student ${studentId}`, {
            distance,
            allowed: maxAllowedDistance
          });
          return {
            valid: false,
            reason: 'OUT_OF_RANGE',
            message: `You are ${distance}m away from class location (max ${maxAllowedDistance}m)`,
            riskScore: 85,
            distance,
            maxDistance: maxAllowedDistance
          };
        }
      }

      // Calculate risk score based on scan context
      const riskScore = await this._calculateRiskScore(
        studentId,
        classSessionId,
        decoded.lecturerId,
        scanContext
      );

      // Mark token as used
      tokenData.used = true;
      tokenData.usedBy.push(studentId);
      await redis.setex(
        redisKey,
        QR_VALIDITY_SECONDS,
        JSON.stringify(tokenData)
      );

      // Log successful scan
      await db.execute(
        `INSERT INTO attendance_scans 
         (class_session_id, student_id, lecturer_id, scan_time, ip_address, device_hash, latitude, longitude, risk_score, status)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'verified')`,
        [
          classSessionId,
          studentId,
          decoded.lecturerId,
          scanContext.ipAddress || null,
          scanContext.deviceHash || null,
          scanContext.latitude || null,
          scanContext.longitude || null,
          riskScore
        ]
      );

      logger.info(`QR token validated successfully for student ${studentId}`, {
        sessionId: classSessionId,
        riskScore
      });

      return {
        valid: true,
        message: 'Attendance marked successfully',
        sessionId: classSessionId,
        lecturerId: decoded.lecturerId,
        riskScore,
        flagged: riskScore > 60
      };
    } catch (error) {
      logger.error('Error validating QR token:', error);
      throw error;
    }
  }

  /**
   * Refresh QR token for live display (every 20 seconds)
   * @param {number} classSessionId - Session ID
   * @param {number} lecturerId - Lecturer ID
   * @returns {Promise<Object>} New token and metadata
   */
  async refreshQRToken(classSessionId, lecturerId) {
    try {
      // Get classroom coordinates from current session
      const [sessionData] = await db.execute(
        `SELECT c.location_lat, c.location_lng FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ? AND cs.lecturer_id = ?`,
        [classSessionId, lecturerId]
      );

      if (!sessionData || sessionData.length === 0) {
        throw new Error('Session not found');
      }

      const classroomCoords = JSON.stringify({
        latitude: sessionData[0].location_lat,
        longitude: sessionData[0].location_lng
      });

      return this.generateQRToken(classSessionId, lecturerId, classroomCoords);
    } catch (error) {
      logger.error('Error refreshing QR token:', error);
      throw error;
    }
  }

  /**
   * Invalidate QR token manually (e.g., when attendance window closes)
   */
  async invalidateQRToken(classSessionId, lecturerId) {
    try {
      const redisKey = `qr_token:${classSessionId}:${lecturerId}`;
      await redis.del(redisKey);

      await db.execute(
        `UPDATE qr_tokens SET status = 'invalidated', invalidated_at = NOW()
         WHERE class_session_id = ? AND lecturer_id = ? AND status = 'active'`,
        [classSessionId, lecturerId]
      );

      logger.info(`QR token invalidated for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error invalidating QR token:', error);
      throw error;
    }
  }

  /**
   * Calculate Haversine distance between two coordinates (in meters)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate AI risk score based on scan context
   * Detects: proxy attendance, device reuse, late scans, location anomalies
   */
  async _calculateRiskScore(studentId, classSessionId, lecturerId, scanContext) {
    try {
      let riskScore = 0;

      // 1. Check for repeated device reuse
      const [deviceScans] = await db.execute(
        `SELECT COUNT(*) as count FROM attendance_scans
         WHERE student_id = ? AND device_hash = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [studentId, scanContext.deviceHash]
      );
      
      if (deviceScans && deviceScans[0].count > 5) {
        riskScore += 15; // Device reuse penalty
      }

      // 2. Check for attendance from multiple IPs in short time
      const [multipleIPs] = await db.execute(
        `SELECT COUNT(DISTINCT ip_address) as ip_count FROM attendance_scans
         WHERE student_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [studentId]
      );

      if (multipleIPs && multipleIPs[0].ip_count > 2) {
        riskScore += 20; // Multiple IPs penalty
      }

      // 3. Check for late scans (after session start + 5 min)
      const [sessionStart] = await db.execute(
        `SELECT start_time FROM class_sessions WHERE id = ?`,
        [classSessionId]
      );

      if (sessionStart && sessionStart.length > 0) {
        const startTime = new Date(sessionStart[0].start_time);
        const scanTime = new Date();
        const minutesLate = (scanTime - startTime) / (1000 * 60);

        if (minutesLate > 5 && minutesLate < 30) {
          riskScore += 10; // Late scan penalty
        }
      }

      // 4. Location deviation from student's typical pattern
      const [locationPattern] = await db.execute(
        `SELECT AVG(latitude) as avg_lat, AVG(longitude) as avg_lon FROM attendance_scans
         WHERE student_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [studentId]
      );

      if (locationPattern && locationPattern[0].avg_lat) {
        const distance = this._calculateDistance(
          locationPattern[0].avg_lat,
          locationPattern[0].avg_lon,
          scanContext.latitude || 0,
          scanContext.longitude || 0
        );

        if (distance > 500) { // 500m deviation
          riskScore += 12; // Location anomaly penalty
        }
      }

      return Math.min(riskScore, 100); // Cap at 100
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 0; // Return 0 if calculation fails
    }
  }

  /**
   * Hash token for storage (one-way)
   */
  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = new QRTokenService();
module.exports.QRTokenService = QRTokenService;
