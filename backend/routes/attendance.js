const express = require('express');
const attendanceService = require('../services/attendanceService');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');

const router = express.Router();

// POST /attendance/student-checkin
// Sample request: { "session_id": 1, "latitude": 40.7128, "longitude": -74.0060, "browser_fingerprint": "unique_hash" }
// Sample response: { "message": "Check-in successful", "status": "success" }
router.post('/student-checkin', authMiddleware, async (req, res) => {
  try {
    const result = await attendanceService.studentCheckin(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance/lecturer-checkin
// Sample request: { "session_id": 1 }
// Sample response: { "message": "Lecturer checked in", "timestamp": "2023-12-01T09:00:00Z" }
router.post('/lecturer-checkin', authMiddleware, async (req, res) => {
  try {
    const result = await attendanceService.lecturerCheckin(req.user.id, req.body.session_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/lecturer/class/:classId - Get attendance records for a lecturer's class
router.get('/lecturer/class/:classId', authMiddleware, requireRole('lecturer'), async (req, res) => {
  try {
    const db = require('../database');
    const { classId } = req.params;
    const { date } = req.query;

    // First verify the class belongs to the lecturer
    const [classCheck] = await db.execute(
      'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
      [classId, req.user.id]
    );

    if (classCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Class not found or does not belong to you.'
      });
    }

    // Get all enrolled students for the class
    const [enrolledStudents] = await db.execute(`
      SELECT DISTINCT
        u.id as student_id,
        u.name as student_name,
        u.email
      FROM users u
      JOIN attendance_logs al ON u.id = al.student_id
      JOIN class_sessions cs ON al.session_id = cs.id
      WHERE cs.class_id = ?
      ORDER BY u.name
    `, [classId]);

    // Get attendance records for the specified date
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [attendanceRecords] = await db.execute(`
      SELECT
        al.student_id,
        u.name as student_name,
        al.status,
        al.checkin_time,
        al.latitude,
        al.longitude,
        al.device_name,
        al.browser_fingerprint
      FROM attendance_logs al
      JOIN users u ON al.student_id = u.id
      JOIN class_sessions cs ON al.session_id = cs.id
      WHERE cs.class_id = ?
        AND DATE(al.checkin_time) = ?
      ORDER BY u.name
    `, [classId, targetDate]);

    // Combine enrolled students with their attendance records
    const attendanceData = enrolledStudents.map(student => {
      const record = attendanceRecords.find(r => r.student_id === student.student_id);
      return {
        student_id: student.student_id,
        student_name: student.student_name,
        status: record ? record.status : 'absent',
        checkin_time: record ? record.checkin_time : null,
        latitude: record ? record.latitude : null,
        longitude: record ? record.longitude : null,
        device_name: record ? record.device_name : null
      };
    });

    res.json({
      success: true,
      message: 'Attendance data retrieved successfully',
      data: attendanceData
    });
  } catch (error) {
    console.error('Error fetching lecturer attendance data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
