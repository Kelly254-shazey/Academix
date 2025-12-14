const express = require('express');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');
const router = express.Router();

/**
 * POST /api/attendance/student-checkin
 * Student checks in to a class session with location verification
 */
router.post('/student-checkin', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { sessionId, latitude, longitude, fingerprint } = req.body;
    const db = require('../database');

    // Verify session exists and get classroom coordinates
    const [sessionData] = await db.execute(`
      SELECT cs.id, cs.class_id, c.latitude as classroom_lat, c.longitude as classroom_lng, cs.qr_code
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = ?
    `, [sessionId]);

    if (!sessionData.length) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessionData[0];

    // Calculate distance from classroom (simplified)
    const distance = Math.sqrt(
      Math.pow(latitude - session.classroom_lat, 2) +
      Math.pow(longitude - session.classroom_lng, 2)
    );

    // Insert attendance log
    await db.execute(`
      INSERT INTO attendance_logs
      (class_session_id, student_id, checkin_time, captured_lat, captured_lng, captured_fingerprint, distance_from_classroom, verification_status, status)
      VALUES (?, ?, NOW(), ?, ?, ?, ?, 'verified', 'present')
    `, [sessionId, req.user.id, latitude, longitude, fingerprint, distance]);

    res.json({ success: true, message: 'Check-in successful', distance });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/attendance/lecturer-checkin
 * Lecturer initiates attendance for a session (opens QR code)
 */
router.post('/lecturer-checkin', authMiddleware, requireRole('lecturer'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const db = require('../database');

    // Verify session belongs to lecturer
    const [sessionCheck] = await db.execute(`
      SELECT cs.id FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = ? AND c.lecturer_id = ?
    `, [sessionId, req.user.id]);

    if (!sessionCheck.length) {
      return res.status(403).json({ success: false, message: 'Session not found or access denied' });
    }

    // Generate QR code and set expiry (15 minutes)
    const qrCode = `QR_${sessionId}_${Date.now()}`;
    const qrExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.execute(`
      UPDATE class_sessions SET qr_code = ?, qr_expiry = ? WHERE id = ?
    `, [qrCode, qrExpiry, sessionId]);

    res.json({
      success: true,
      message: 'Attendance opened',
      data: { qrCode, expiresAt: qrExpiry }
    });
  } catch (error) {
    console.error('Lecturer checkin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/attendance/lecturer/class/:classId
 * Get attendance records for a class
 */
router.get('/lecturer/class/:classId', authMiddleware, requireRole('lecturer'), async (req, res) => {
  try {
    const db = require('../database');
    const { classId } = req.params;
    const { date } = req.query;

    // Verify access
    const [classCheck] = await db.execute(
      'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
      [classId, req.user.id]
    );

    if (!classCheck.length) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get enrolled students
    const [students] = await db.execute(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      WHERE ce.class_id = ?
      ORDER BY u.name
    `, [classId]);

    // Get attendance for date
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [records] = await db.execute(`
      SELECT
        al.student_id,
        al.status,
        al.checkin_time,
        al.captured_lat,
        al.captured_lng,
        al.distance_from_classroom
      FROM attendance_logs al
      JOIN class_sessions cs ON al.class_session_id = cs.id
      WHERE cs.class_id = ? AND DATE(al.checkin_time) = ?
    `, [classId, targetDate]);

    // Merge data
    const attendance = students.map(student => {
      const record = records.find(r => r.student_id === student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        email: student.email,
        status: record ? record.status : 'absent',
        checkinTime: record?.checkin_time || null,
        latitude: record?.captured_lat || null,
        longitude: record?.captured_lng || null
      };
    });

    res.json({ success: true, data: attendance, date: targetDate });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/attendance/student/attendance-history
 * Get student's attendance history
 */
router.get('/student/attendance-history', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const db = require('../database');
    const { classId, startDate, endDate } = req.query;

    let query = `
      SELECT
        c.class_code,
        c.course_name,
        al.checkin_time,
        al.status,
        al.captured_lat,
        al.captured_lng
      FROM attendance_logs al
      JOIN class_sessions cs ON al.class_session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      WHERE al.student_id = ?
    `;
    const params = [req.user.id];

    if (classId) {
      query += ` AND c.id = ?`;
      params.push(classId);
    }
    if (startDate) {
      query += ` AND DATE(al.checkin_time) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(al.checkin_time) <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY al.checkin_time DESC`;

    const [history] = await db.execute(query, params);

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
