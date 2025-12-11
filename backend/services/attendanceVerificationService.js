// attendanceVerificationService.js
// Verify/unverify student attendance, manual marking, and verification audit
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class AttendanceVerificationService {
  /**
   * Verify a student's attendance
   */
  async verifyAttendance(
    lecturerId,
    classId,
    sessionId,
    studentId,
    attendanceId,
    verificationReason,
    notes,
    deviceId,
    deviceFingerprint
  ) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Get current attendance status
      const attendanceQuery = `
        SELECT id, status FROM attendance_logs
        WHERE id = ? AND student_id = ? AND session_id = ?
      `;

      const [attendanceResults] = await conn.query(attendanceQuery, [
        attendanceId,
        studentId,
        sessionId,
      ]);

      if (!attendanceResults || attendanceResults.length === 0) {
        throw new Error('Attendance record not found');
      }

      const originalStatus = attendanceResults[0].status;

      // Update attendance verification
      const updateQuery = `
        UPDATE attendance_logs
        SET verified = TRUE,
            verified_by = ?,
            verification_time = NOW(),
            verification_device_id = ?,
            verification_notes = ?
        WHERE id = ?
      `;

      const [result] = await conn.query(updateQuery, [
        lecturerId,
        deviceId,
        notes,
        attendanceId,
      ]);

      // Insert into verification log
      const verificationQuery = `
        INSERT INTO lecturer_verifications (
          lecturer_id, attendance_id, student_id, class_id, session_id,
          original_status, verified_status, verification_reason,
          verification_notes, device_id, device_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [verificationResult] = await conn.query(verificationQuery, [
        lecturerId,
        attendanceId,
        studentId,
        classId,
        sessionId,
        originalStatus,
        originalStatus,
        verificationReason,
        notes,
        deviceId,
        deviceFingerprint,
      ]);

      // Audit log
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'ATTENDANCE_VERIFIED',
        resource_type: 'attendance',
        resource_id: attendanceId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        old_value: { verified: false },
        new_value: { verified: true, reason: verificationReason },
      });

      conn.end();

      logger.info(`Attendance ${attendanceId} verified by lecturer ${lecturerId}`);

      return {
        success: true,
        data: {
          verificationId: verificationResult.insertId,
          attendanceId,
          studentId,
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in verifyAttendance:', error);
      throw error;
    }
  }

  /**
   * Unverify attendance
   */
  async unverifyAttendance(
    lecturerId,
    attendanceId,
    classId,
    sessionId,
    reason,
    deviceId,
    deviceFingerprint
  ) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE attendance_logs
        SET verified = FALSE,
            verified_by = NULL,
            verification_time = NULL,
            verification_device_id = NULL,
            verification_notes = ?
        WHERE id = ?
      `;

      const [result] = await conn.query(updateQuery, [reason, attendanceId]);

      if (result.affectedRows === 0) {
        throw new Error('Attendance record not found');
      }

      // Audit log
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'ATTENDANCE_UNVERIFIED',
        resource_type: 'attendance',
        resource_id: attendanceId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: { verified: false, reason },
      });

      conn.end();

      return {
        success: true,
        data: {
          attendanceId,
          verified: false,
          unverifiedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in unverifyAttendance:', error);
      throw error;
    }
  }

  /**
   * Mark attendance manually (present/absent/excused)
   */
  async markAttendance(
    lecturerId,
    classId,
    sessionId,
    studentId,
    status,
    reason,
    notes,
    deviceId,
    deviceFingerprint
  ) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Check if attendance record exists
      const existingQuery = `
        SELECT id FROM attendance_logs
        WHERE student_id = ? AND session_id = ?
      `;

      const [existing] = await conn.query(existingQuery, [studentId, sessionId]);

      let attendanceId;

      if (existing && existing.length > 0) {
        // Update existing
        const updateQuery = `
          UPDATE attendance_logs
          SET status = ?,
              verified = TRUE,
              verified_by = ?,
              verification_time = NOW(),
              verification_device_id = ?,
              verification_notes = ?
          WHERE student_id = ? AND session_id = ?
        `;

        const [updateResult] = await conn.query(updateQuery, [
          status,
          lecturerId,
          deviceId,
          notes,
          studentId,
          sessionId,
        ]);

        attendanceId = existing[0].id;
      } else {
        // Create new
        const insertQuery = `
          INSERT INTO attendance_logs (
            student_id, session_id, status, verified, verified_by,
            verification_time, verification_device_id, verification_notes
          ) VALUES (?, ?, ?, TRUE, ?, NOW(), ?, ?)
        `;

        const [insertResult] = await conn.query(insertQuery, [
          studentId,
          sessionId,
          status,
          lecturerId,
          deviceId,
          notes,
        ]);

        attendanceId = insertResult.insertId;
      }

      // Insert verification log
      const verificationQuery = `
        INSERT INTO lecturer_verifications (
          lecturer_id, attendance_id, student_id, class_id, session_id,
          verified_status, verification_reason, verification_notes,
          device_id, device_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await conn.query(verificationQuery, [
        lecturerId,
        attendanceId,
        studentId,
        classId,
        sessionId,
        status,
        reason,
        notes,
        deviceId,
        deviceFingerprint,
      ]);

      // Audit log
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'ATTENDANCE_MANUALLY_MARKED',
        resource_type: 'attendance',
        resource_id: attendanceId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: { status, reason },
      });

      conn.end();

      logger.info(
        `Student ${studentId} marked ${status} by lecturer ${lecturerId}`
      );

      return {
        success: true,
        data: {
          attendanceId,
          studentId,
          status,
          markedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in markAttendance:', error);
      throw error;
    }
  }

  /**
   * Get verification history for attendance
   */
  async getVerificationHistory(attendanceId, limit = 20) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          id, lecturer_id, student_id, original_status, verified_status,
          verification_reason, verification_notes, verified_at
        FROM lecturer_verifications
        WHERE attendance_id = ?
        ORDER BY verified_at DESC
        LIMIT ?
      `;

      const [results] = await conn.query(query, [attendanceId, limit]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getVerificationHistory:', error);
      throw error;
    }
  }

  /**
   * Get lecturer verification stats
   */
  async getVerificationStats(lecturerId, classId, startDate, endDate) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT 
          DATE(lv.verified_at) as date,
          COUNT(DISTINCT lv.id) as verifications,
          COUNT(DISTINCT CASE WHEN lv.verified_status = 'present' THEN lv.student_id END) as marked_present,
          COUNT(DISTINCT CASE WHEN lv.verified_status = 'absent' THEN lv.student_id END) as marked_absent,
          COUNT(DISTINCT CASE WHEN lv.verified_status = 'excused' THEN lv.student_id END) as marked_excused
        FROM lecturer_verifications lv
        WHERE lv.lecturer_id = ? AND lv.class_id = ?
          AND DATE(lv.verified_at) BETWEEN ? AND ?
        GROUP BY DATE(lv.verified_at)
        ORDER BY date DESC
      `;

      const [results] = await conn.query(query, [
        lecturerId,
        classId,
        startDate,
        endDate,
      ]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getVerificationStats:', error);
      throw error;
    }
  }

  /**
   * Audit log helper
   */
  async auditLog(conn, data) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, class_id, session_id,
        old_value, new_value, device_id, device_fingerprint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success')
    `;

    try {
      await conn.query(query, [
        data.user_id,
        data.action,
        data.resource_type,
        data.resource_id,
        data.class_id,
        data.session_id,
        data.old_value ? JSON.stringify(data.old_value) : null,
        data.new_value ? JSON.stringify(data.new_value) : null,
        data.device_id,
        data.device_fingerprint,
      ]);
    } catch (error) {
      logger.error('Error logging verification audit:', error);
    }
  }
}

module.exports = new AttendanceVerificationService();
