/**
 * Attendance Service
 * Manages student and lecturer check-ins with multi-factor validation
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { validateGeofence } = require('../utils/gpsValidator');
const { validateFingerprint, detectAnomalies } = require('../utils/fingerprinting');
const QRService = require('./QRService');

class AttendanceService {
  /**
   * Student check-in: QR validation + GPS verification + Fingerprinting
   */
  static async studentCheckIn(sessionId, studentId, qrData, gpsData, fingerprint) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Step 1: Validate QR code
      const qrValidation = await QRService.validateQRCode(sessionId, qrData);
      if (!qrValidation.valid) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: qrValidation.reason,
          verification_status: 'expired_qr',
        };
      }

      // Step 2: Get session and class details
      const sessionResult = await client.query(
        `SELECT cs.*, c.location_lat, c.location_lng, c.geofence_radius_meters
         FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = $1`,
        [sessionId],
      );

      if (sessionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'Session not found',
          verification_status: 'invalid_session',
        };
      }

      const session = sessionResult.rows[0];

      // Step 3: Validate GPS (geofencing)
      const gpsValidation = validateGeofence(
        gpsData.latitude,
        gpsData.longitude,
        session.location_lat,
        session.location_lng,
        session.geofence_radius_meters,
      );

      const gpsStatus = gpsValidation.valid ? 'success' : 'gps_fail';

      // Step 4: Check for fingerprint anomalies
      const recentLogs = await client.query(
        `SELECT student_id, browser_fingerprint FROM attendance_logs
         WHERE session_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [sessionId],
      );

      const anomalyDetection = detectAnomalies(fingerprint, recentLogs.rows);

      // Determine final verification status
      let verificationStatus = 'success';
      if (!gpsValidation.valid) verificationStatus = 'gps_fail';
      if (anomalyDetection.suspicious) verificationStatus = 'spoofed';

      // Step 5: Record attendance
      const attendanceId = uuidv4();
      const now = new Date();

      await client.query(
        `INSERT INTO attendance_logs 
         (id, session_id, student_id, check_in_timestamp, latitude, longitude, 
          browser_fingerprint, verification_status, gps_distance_meters, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          attendanceId,
          sessionId,
          studentId,
          now,
          gpsData.latitude,
          gpsData.longitude,
          fingerprint,
          verificationStatus,
          gpsValidation.distance,
          now,
        ],
      );

      await client.query('COMMIT');

      return {
        success: true,
        attendance_id: attendanceId,
        verification_status: verificationStatus,
        gps: gpsValidation,
        anomaly: anomalyDetection,
        message: `Check-in successful (${verificationStatus})`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Student check-in error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lecturer check-in
   */
  static async lecturerCheckIn(sessionId, lecturerId) {
    try {
      const now = new Date();

      const result = await db.query(
        `UPDATE class_sessions 
         SET lecturer_checked_in = true, lecturer_check_in_time = $1, status = 'ongoing'
         WHERE id = $2 AND lecturer_id = $3
         RETURNING *`,
        [now, sessionId, lecturerId],
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Session not found or unauthorized',
        };
      }

      return {
        success: true,
        session: result.rows[0],
        message: 'Lecturer checked in successfully',
      };
    } catch (err) {
      console.error('Lecturer check-in error:', err);
      throw err;
    }
  }

  /**
   * Get student attendance history
   */
  static async getStudentAttendance(studentId, limit = 50, offset = 0) {
    try {
      const result = await db.query(
        `SELECT al.*, c.course_name, c.course_code
         FROM attendance_logs al
         JOIN class_sessions cs ON al.session_id = cs.id
         JOIN classes c ON cs.class_id = c.id
         WHERE al.student_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2 OFFSET $3`,
        [studentId, limit, offset],
      );

      return {
        success: true,
        records: result.rows,
      };
    } catch (err) {
      console.error('Get student attendance error:', err);
      throw err;
    }
  }

  /**
   * Get class attendance summary
   */
  static async getClassAttendance(classId) {
    try {
      const result = await db.query(
        `SELECT 
           COUNT(*) as total_students,
           SUM(CASE WHEN verification_status = 'success' THEN 1 ELSE 0 END) as verified_present,
           SUM(CASE WHEN verification_status = 'gps_fail' THEN 1 ELSE 0 END) as gps_failed,
           SUM(CASE WHEN verification_status = 'spoofed' THEN 1 ELSE 0 END) as spoofed_attempts
         FROM attendance_logs al
         JOIN class_sessions cs ON al.session_id = cs.id
         WHERE cs.class_id = $1`,
        [classId],
      );

      return {
        success: true,
        summary: result.rows[0],
      };
    } catch (err) {
      console.error('Get class attendance error:', err);
      throw err;
    }
  }

  /**
   * Calculate student attendance percentage
   */
  static async getAttendancePercentage(studentId, courseId) {
    try {
      const result = await db.query(
        `SELECT 
           COUNT(DISTINCT cs.id) as total_sessions,
           COUNT(DISTINCT CASE WHEN al.id IS NOT NULL THEN al.id END) as attended_sessions,
           ROUND(
             (COUNT(DISTINCT CASE WHEN al.id IS NOT NULL THEN al.id END) * 100.0 / 
              COUNT(DISTINCT cs.id)), 2
           ) as attendance_percentage
         FROM class_sessions cs
         LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = $1
         JOIN classes c ON cs.class_id = c.id
         WHERE c.id = $2`,
        [studentId, courseId],
      );

      return {
        success: true,
        stats: result.rows[0],
      };
    } catch (err) {
      console.error('Get attendance percentage error:', err);
      throw err;
    }
  }
}

module.exports = AttendanceService;
