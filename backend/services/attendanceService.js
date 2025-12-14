const db = require('../database');

class AttendanceService {
  async studentCheckin(userId, data) {
    const { session_id, latitude, longitude, browser_fingerprint } = data;

    if (!session_id) {
      throw new Error('Session ID is required');
    }

    // Verify session exists and is active
    const [sessionRows] = await db.execute(
      'SELECT id, class_id, session_date, qr_expires_at, is_active FROM class_sessions WHERE id = ?',
      [session_id]
    );

    if (sessionRows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionRows[0];

    if (!session.is_active) {
      throw new Error('Session is not active');
    }

    // Check if QR code has expired
    if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
      throw new Error('QR code has expired');
    }

    // Check if student already checked in for this session
    const [existingCheckin] = await db.execute(
      'SELECT id FROM attendance_logs WHERE session_id = ? AND student_id = ?',
      [session_id, userId]
    );

    if (existingCheckin.length > 0) {
      throw new Error('Already checked in for this session');
    }

    // Insert attendance record
    const checkinTime = new Date();
    await db.execute(
      'INSERT INTO attendance_logs (session_id, student_id, checkin_time, captured_lat, captured_lng, captured_fingerprint, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [session_id, userId, checkinTime, latitude || null, longitude || null, browser_fingerprint || null, 'success']
    );

    // Update attendance analytics
    await this.updateAttendanceAnalytics(userId, session.class_id);

    return {
      message: 'Check-in successful',
      status: 'success',
      timestamp: checkinTime.toISOString(),
      sessionId: session_id
    };
  }

  async lecturerCheckin(userId, sessionId) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Verify lecturer owns the class for this session
    const [sessionRows] = await db.execute(`
      SELECT cs.id, cs.class_id, c.lecturer_id
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = ? AND c.lecturer_id = ?
    `, [sessionId, userId]);

    if (sessionRows.length === 0) {
      throw new Error('Session not found or access denied');
    }

    // Mark session as started (you might want to add a status field to class_sessions)
    // For now, just return success
    return {
      message: 'Lecturer checked in successfully',
      timestamp: new Date().toISOString(),
      sessionId
    };
  }

  async updateAttendanceAnalytics(studentId, classId) {
    try {
      // Get total sessions for this class
      const [totalSessionsResult] = await db.execute(
        'SELECT COUNT(*) as total FROM class_sessions WHERE class_id = ?',
        [classId]
      );
      const totalSessions = totalSessionsResult[0].total;

      // Get attended sessions for this student in this class
      const [attendedResult] = await db.execute(
        'SELECT COUNT(*) as attended FROM attendance_logs al JOIN class_sessions cs ON al.session_id = cs.id WHERE cs.class_id = ? AND al.student_id = ?',
        [classId, studentId]
      );
      const attended = attendedResult[0].attended;

      const attendancePercent = totalSessions > 0 ? (attended / totalSessions) * 100 : 0;

      // Insert or update student attendance analytics
      await db.execute(`
        INSERT INTO student_attendance_analytics (student_id, class_id, total_sessions, attended, attendance_percent)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        total_sessions = VALUES(total_sessions),
        attended = VALUES(attended),
        attendance_percent = VALUES(attendance_percent),
        last_updated = CURRENT_TIMESTAMP
      `, [studentId, classId, totalSessions, attended, attendancePercent]);

    } catch (error) {
      console.error('Error updating attendance analytics:', error);
      // Don't throw error to avoid breaking check-in process
    }
  }

  async getAttendanceForSession(sessionId) {
    const [rows] = await db.execute(`
      SELECT
        al.id,
        al.student_id,
        u.name as student_name,
        u.email,
        al.checkin_time,
        al.captured_lat,
        al.captured_lng,
        al.captured_fingerprint,
        al.verification_status
      FROM attendance_logs al
      JOIN users u ON al.student_id = u.id
      WHERE al.session_id = ?
      ORDER BY al.checkin_time ASC
    `, [sessionId]);

    return rows;
  }

  async getStudentAttendanceHistory(studentId, classId = null) {
    let query = `
      SELECT
        al.id,
        al.session_id,
        cs.session_date,
        c.course_code,
        c.course_name,
        al.checkin_time,
        al.verification_status
      FROM attendance_logs al
      JOIN class_sessions cs ON al.session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      WHERE al.student_id = ?
    `;
    const params = [studentId];

    if (classId) {
      query += ' AND cs.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY cs.session_date DESC, al.checkin_time DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = new AttendanceService();
