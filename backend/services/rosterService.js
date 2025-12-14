// rosterService.js
// Manage class roster, attendance marking, and live roster updates
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class RosterService {
  /**
   * Get live roster for a session
   * Includes students, attendance status, verification status, last check-in time
   */
  async getLiveRoster(classId, sessionId) {
    try {

      const query = `
        SELECT 
          u.id as student_id,
          u.name as student_name,
          u.email as student_email,
          u.student_id_number,
          COALESCE(al.status, 'unmarked') as attendance_status,
          COALESCE(al.verified, FALSE) as is_verified,
          al.check_in_time,
          al.check_in_method,
          lv.verified_at as verification_time,
          lv.verification_notes,
          COALESCE(al.id, 0) as attendance_id,
          c.enrollment_count > 0 as is_enrolled
        FROM users u
        INNER JOIN classes c ON u.id IN (
          SELECT student_id FROM class_enrollments WHERE class_id = ?
        )
        LEFT JOIN attendance_logs al ON u.id = al.student_id AND al.session_id = ?
        LEFT JOIN lecturer_verifications lv ON al.id = lv.attendance_id
        WHERE c.id = ? AND u.role = 'student'
        ORDER BY u.name ASC
      `;

      const [results] = await db.execute(query, [classId, sessionId, classId]);

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getLiveRoster:', error);
      throw error;
    }
  }

  /**
   * Get attendance summary for a session
   */
  async getAttendanceSummary(classId, sessionId) {
    try {

      // Total students in class
      const totalQuery = `
        SELECT COUNT(DISTINCT student_id) as total_students
        FROM class_enrollments
        WHERE class_id = ?
      `;

      const [totalResults] = await db.execute(totalQuery, [classId]);
      const totalStudents = totalResults[0]?.total_students || 0;

      // Attendance breakdown
      const summaryQuery = `
        SELECT 
          COALESCE(al.status, 'absent') as status,
          COUNT(DISTINCT CASE WHEN al.student_id IS NOT NULL THEN al.student_id END) as count
        FROM class_enrollments ce
        LEFT JOIN attendance_logs al ON ce.student_id = al.student_id AND al.session_id = ?
        WHERE ce.class_id = ?
        GROUP BY COALESCE(al.status, 'absent')
      `;

      const [summaryResults] = await db.execute(summaryQuery, [sessionId, classId]);

      // Calculate percentages
      const summary = {
        total_students: totalStudents,
        present: 0,
        absent: 0,
        excused: 0,
        late: 0,
        unmarked: 0,
        verified_count: 0,
        attendance_percentage: 0,
      };

      summaryResults.forEach((row) => {
        if (row.status === 'present') summary.present = row.count;
        else if (row.status === 'absent') summary.absent = row.count;
        else if (row.status === 'excused') summary.excused = row.count;
        else if (row.status === 'late') summary.late = row.count;
        else if (row.status === 'unmarked') summary.unmarked = row.count;
      });

      summary.attendance_percentage =
        totalStudents > 0
          ? Math.round(
              ((summary.present + summary.late + summary.excused) /
                totalStudents) *
                100
            )
          : 0;

      // Get verified count
      const verifiedQuery = `
        SELECT COUNT(DISTINCT al.student_id) as verified_count
        FROM attendance_logs al
        WHERE al.session_id = ? AND al.verified = TRUE
      `;

      const [verifiedResults] = await db.execute(verifiedQuery, [sessionId]);
      summary.verified_count = verifiedResults[0]?.verified_count || 0;

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      logger.error('Error in getAttendanceSummary:', error);
      throw error;
    }
  }

  /**
   * Mark single student attendance (present/absent/excused/late)
   */
  async markStudentAttendance(
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

      // Check if attendance exists
      const checkQuery = `
        SELECT id FROM attendance_logs
        WHERE student_id = ? AND session_id = ?
      `;

      const [existing] = await db.execute(checkQuery, [studentId, sessionId]);

      let attendanceId;

      if (existing && existing.length > 0) {
        // Update
        const oldStatusQuery = `
          SELECT status FROM attendance_logs WHERE id = ?
        `;
        const [oldStatus] = await db.execute(oldStatusQuery, [existing[0].id]);

        const updateQuery = `
          UPDATE attendance_logs
          SET status = ?, verified = TRUE, verified_by = ?,
              verification_time = NOW(), verification_device_id = ?,
              verification_notes = ?
          WHERE student_id = ? AND session_id = ?
        `;

        const [result] = await db.execute(updateQuery, [
          status,
          lecturerId,
          deviceId,
          notes,
          studentId,
          sessionId,
        ]);

        attendanceId = existing[0].id;

        // Audit log with old/new values
        await this.auditLog(conn, {
          user_id: lecturerId,
          action: 'ATTENDANCE_MARKED',
          resource_type: 'attendance',
          resource_id: attendanceId,
          class_id: classId,
          session_id: sessionId,
          device_id: deviceId,
          device_fingerprint: deviceFingerprint,
          old_value: { status: oldStatus[0]?.status || 'unmarked' },
          new_value: { status, reason },
        });
      } else {
        // Create new attendance record
        const insertQuery = `
          INSERT INTO attendance_logs (
            student_id, session_id, status, verified, verified_by,
            verification_time, verification_device_id, verification_notes
          ) VALUES (?, ?, ?, TRUE, ?, NOW(), ?, ?)
        `;

        const [insertResult] = await db.execute(insertQuery, [
          studentId,
          sessionId,
          status,
          lecturerId,
          deviceId,
          notes,
        ]);

        attendanceId = insertResult.insertId;

        // Audit log for new record
        await this.auditLog(conn, {
          user_id: lecturerId,
          action: 'ATTENDANCE_CREATED',
          resource_type: 'attendance',
          resource_id: attendanceId,
          class_id: classId,
          session_id: sessionId,
          device_id: deviceId,
          device_fingerprint: deviceFingerprint,
          new_value: { status, reason },
        });
      }

      // Create verification log
      const verificationQuery = `
        INSERT INTO lecturer_verifications (
          lecturer_id, attendance_id, student_id, class_id, session_id,
          verified_status, verification_reason, verification_notes,
          device_id, device_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.execute(verificationQuery, [
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

      logger.info(
        `Student ${studentId} marked ${status} in session ${sessionId} by lecturer ${lecturerId}`
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
      if (conn)
      logger.error('Error in markStudentAttendance:', error);
      throw error;
    }
  }

  /**
   * Bulk mark attendance for multiple students
   */
  async bulkMarkAttendance(
    lecturerId,
    classId,
    sessionId,
    markings,
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

      const results = [];
      const errors = [];

      for (const marking of markings) {
        try {
          // Check existing attendance
          const checkQuery = `
            SELECT id FROM attendance_logs
            WHERE student_id = ? AND session_id = ?
          `;

          const [existing] = await db.execute(checkQuery, [
            marking.studentId,
            sessionId,
          ]);

          let attendanceId;

          if (existing && existing.length > 0) {
            const updateQuery = `
              UPDATE attendance_logs
              SET status = ?, verified = TRUE, verified_by = ?,
                  verification_time = NOW(), verification_device_id = ?
              WHERE student_id = ? AND session_id = ?
            `;

            await db.execute(updateQuery, [
              marking.status,
              lecturerId,
              deviceId,
              marking.studentId,
              sessionId,
            ]);

            attendanceId = existing[0].id;
          } else {
            const insertQuery = `
              INSERT INTO attendance_logs (
                student_id, session_id, status, verified, verified_by,
                verification_time, verification_device_id
              ) VALUES (?, ?, ?, TRUE, ?, NOW(), ?)
            `;

            const [insertResult] = await db.execute(insertQuery, [
              marking.studentId,
              sessionId,
              marking.status,
              lecturerId,
              deviceId,
            ]);

            attendanceId = insertResult.insertId;
          }

          results.push({
            studentId: marking.studentId,
            status: marking.status,
            success: true,
          });
        } catch (error) {
          logger.error(`Error marking student ${marking.studentId}:`, error);
          errors.push({
            studentId: marking.studentId,
            error: error.message,
          });
        }
      }

      // Audit log bulk action
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'BULK_ATTENDANCE_MARKED',
        resource_type: 'attendance_batch',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: { count: markings.length, successful: results.length },
      });

      return {
        success: errors.length === 0,
        data: {
          processedCount: markings.length,
          successCount: results.length,
          failureCount: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in bulkMarkAttendance:', error);
      throw error;
    }
  }

  /**
   * Get students at risk (low attendance)
   */
  async getAtRiskStudents(classId, sessionId, attendanceThreshold = 75) {
    try {

      const query = `
        SELECT 
          u.id as student_id,
          u.name as student_name,
          u.email,
          COUNT(al.id) as total_sessions,
          SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) as present_count,
          ROUND(
            (SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) / COUNT(al.id)) * 100, 2
          ) as attendance_percentage,
          COUNT(DISTINCT al.session_id) - 
            SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) as absences
        FROM users u
        INNER JOIN class_enrollments ce ON u.id = ce.student_id
        LEFT JOIN attendance_logs al ON u.id = al.student_id
          AND al.session_id IN (
            SELECT id FROM sessions WHERE class_id = ?
          )
        WHERE ce.class_id = ? AND u.role = 'student'
        GROUP BY u.id, u.name, u.email
        HAVING attendance_percentage < ?
        ORDER BY attendance_percentage ASC
      `;

      const [results] = await db.execute(query, [classId, classId, attendanceThreshold]);

      return {
        success: true,
        data: results || [],
        count: results ? results.length : 0,
      };
    } catch (error) {
      logger.error('Error in getAtRiskStudents:', error);
      throw error;
    }
  }

  /**
   * Get student attendance history
   */
  async getStudentAttendanceHistory(classId, studentId, limit = 50) {
    try {

      const query = `
        SELECT 
          al.id, s.id as session_id, s.session_date,
          al.status, al.check_in_time, al.check_in_method,
          al.verified, al.verified_by, al.verification_time,
          u.name as verified_by_name
        FROM attendance_logs al
        INNER JOIN sessions s ON al.session_id = s.id
        INNER JOIN classes c ON s.class_id = c.id
        LEFT JOIN users u ON al.verified_by = u.id
        WHERE c.id = ? AND al.student_id = ?
        ORDER BY s.session_date DESC
        LIMIT ?
      `;

      const [results] = await db.execute(query, [classId, studentId, limit]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getStudentAttendanceHistory:', error);
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
      await db.execute(query, [
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
      logger.error('Error logging roster audit:', error);
    }
  }
}

module.exports = new RosterService();
