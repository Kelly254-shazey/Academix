const db = require('../database');
const logger = require('../utils/logger');
const crypto = require('crypto');

const QR_VALIDITY_SECONDS = 35; // QR codes valid for 35 seconds
const LOCATION_TOLERANCE_METERS = 50; // 50 meters tolerance for stricter validation
const LOCATION_REQUIRED = true; // Location is now mandatory for security

const qrValidationService = {
  // Validate QR token and return session details
  async validateQRToken(qrToken) {
    try {
      const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
      
      const [results] = await db.execute(
        `SELECT 
          cs.id as session_id,
          cs.class_id,
          c.course_code,
          c.course_name,
          c.location_lat as class_lat,
          c.location_lng as class_lng,
          cs.qr_expires_at,
          cs.is_active
        FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        WHERE cs.qr_signature_hash = ? AND cs.is_active = TRUE`,
        [tokenHash]
      );

      if (!results.length) {
        return {
          success: false,
          message: 'Invalid or inactive QR code',
          statusCode: 'INVALID_QR',
        };
      }

      const session = results[0];
      
      // Check if QR has expired
      if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
        return {
          success: false,
          message: 'QR code has expired',
          statusCode: 'EXPIRED_QR',
        };
      }

      return {
        success: true,
        sessionId: session.session_id,
        classId: session.class_id,
        courseCode: session.course_code,
        courseName: session.course_name,
        classLocation: {
          latitude: session.class_lat,
          longitude: session.class_lng,
        },
        expiresAt: session.qr_expires_at,
      };
    } catch (error) {
      logger.error('Error validating QR token:', error);
      throw error;
    }
  },

  // Validate device fingerprint
  async validateDeviceFingerprint(studentId, deviceFingerprint, deviceName) {
    try {
      const [results] = await db.execute(
        `SELECT id, is_verified FROM verified_devices
         WHERE student_id = ? AND device_fingerprint = ?`,
        [studentId, deviceFingerprint]
      );

      if (!results.length) {
        // Device not registered, need verification
        return {
          isVerified: false,
          message: 'Device not verified. Please register this device first.',
          requiresVerification: true,
        };
      }

      const device = results[0];
      
      // Update last used timestamp
      await db.execute(
        `UPDATE verified_devices SET last_used_at = NOW() WHERE id = ?`,
        [device.id]
      );

      return {
        isVerified: device.is_verified,
        message: 'Device verified',
        requiresVerification: false,
      };
    } catch (error) {
      logger.error('Error validating device fingerprint:', error);
      throw error;
    }
  },

  // Validate location proximity
  validateLocationProximity(classLat, classLng, capturedLat, capturedLng) {
    try {
      // Location is now mandatory for security
      if (!classLat || !classLng) {
        return {
          isValid: false,
          message: 'Class location not configured',
          distance: null,
        };
      }

      if (!capturedLat || !capturedLng) {
        return {
          isValid: false,
          message: 'Device location required for check-in validation',
          distance: null,
        };
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(classLat, classLng, capturedLat, capturedLng);

      if (distance > LOCATION_TOLERANCE_METERS) {
        return {
          isValid: false,
          message: `Location verification failed. You must be within ${LOCATION_TOLERANCE_METERS}m of the classroom (${Math.round(distance)}m away)`,
          distance: Math.round(distance),
        };
      }

      return {
        isValid: true,
        message: `Location verified (${Math.round(distance)}m from classroom)`,
        distance: Math.round(distance),
      };
    } catch (error) {
      logger.error('Error validating location:', error);
      throw error;
    }
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Complete QR check-in process
  async processQRCheckin(studentId, qrToken, latitude, longitude, deviceFingerprint, deviceName) {
    try {
      // Step 1: Validate QR token
      const qrValidation = await this.validateQRToken(qrToken);
      if (!qrValidation.success) {
        return {
          success: false,
          status: qrValidation.statusCode,
          message: qrValidation.message,
        };
      }

      const sessionId = qrValidation.sessionId;

      // Step 2: Check if student already checked in
      const [existingCheckin] = await db.execute(
        `SELECT id FROM attendance_logs WHERE session_id = ? AND student_id = ?`,
        [sessionId, studentId]
      );

      if (existingCheckin.length > 0) {
        return {
          success: false,
          status: 'ALREADY_CHECKED_IN',
          message: 'You have already checked in for this class',
        };
      }

      // Step 3: Validate device (if provided)
      let deviceValid = true;
      if (deviceFingerprint) {
        const deviceValidation = await this.validateDeviceFingerprint(
          studentId, deviceFingerprint, deviceName
        );
        deviceValid = deviceValidation.isVerified;
      }

      // Step 4: Validate location (MANDATORY for security)
      if (!latitude || !longitude) {
        return {
          success: false,
          status: 'LOCATION_REQUIRED',
          message: 'Device location is required for secure check-in validation',
        };
      }

      const locationValidation = this.validateLocationProximity(
        qrValidation.classLocation.latitude,
        qrValidation.classLocation.longitude,
        latitude,
        longitude
      );

      if (!locationValidation.isValid) {
        return {
          success: false,
          status: 'LOCATION_INVALID',
          message: locationValidation.message,
          distance: locationValidation.distance,
        };
      }

      const locationValid = true;
      const distance = locationValidation.distance;

      // Step 5: Determine verification status (location is now mandatory)
      let verificationStatus = 'success';
      if (!deviceValid) {
        verificationStatus = 'invalid_fingerprint';
      }
      // Location validation already failed above if invalid, so no need to check here

      // Step 6: Record attendance
      await db.execute(
        `INSERT INTO attendance_logs 
         (session_id, student_id, captured_lat, captured_lng, captured_fingerprint, verification_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, studentId, latitude || null, longitude || null, deviceFingerprint || null, verificationStatus]
      );

      // Step 7: Update student's verified devices if not already
      if (deviceFingerprint && !deviceValid) {
        await db.execute(
          `INSERT INTO verified_devices (student_id, device_fingerprint, device_name, is_verified)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE last_used_at = NOW()`,
          [studentId, deviceFingerprint, deviceName || 'Unknown Device', false]
        );
      }

      return {
        success: true,
        status: verificationStatus,
        message: verificationStatus === 'success' 
          ? 'Check-in successful'
          : `Check-in recorded with warning: ${verificationStatus === 'invalid_fingerprint' ? 'Device not verified' : 'Location mismatch'}`,
        sessionId,
        classInfo: {
          courseCode: qrValidation.courseCode,
          courseName: qrValidation.courseName,
        },
        distance: distance,
      };
    } catch (error) {
      logger.error('Error processing QR check-in:', error);
      throw error;
    }
  },

  // Generate QR code for a class session
  async generateQRForSession(sessionId, classId) {
    try {
      const qrToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
      const expiresAt = new Date(Date.now() + QR_VALIDITY_MINUTES * 60000);

      await db.execute(
        `UPDATE class_sessions 
         SET qr_signature_hash = ?, qr_expires_at = ?
         WHERE id = ?`,
        [tokenHash, expiresAt, sessionId]
      );

      return {
        success: true,
        qrToken,
        expiresAt,
        validityMinutes: QR_VALIDITY_MINUTES,
      };
    } catch (error) {
      logger.error('Error generating QR for session:', error);
      throw error;
    }
  },

  // Verify and register a new device
  async registerDevice(studentId, deviceFingerprint, deviceName) {
    try {
      const [existing] = await db.execute(
        `SELECT id, is_verified FROM verified_devices 
         WHERE student_id = ? AND device_fingerprint = ?`,
        [studentId, deviceFingerprint]
      );

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Device already registered',
          alreadyVerified: existing[0].is_verified,
        };
      }

      await db.execute(
        `INSERT INTO verified_devices (student_id, device_fingerprint, device_name, is_verified)
         VALUES (?, ?, ?, ?)`,
        [studentId, deviceFingerprint, deviceName, true]
      );

      return {
        success: true,
        message: 'Device registered and verified',
      };
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  },
};

module.exports = qrValidationService;
