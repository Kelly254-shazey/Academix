/**
 * Attendance Routes
 */

const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/AttendanceController');
const { authenticateToken, verifyRole } = require('../middleware/auth');

// Student check-in
router.post('/check-in', authenticateToken, verifyRole(['student']), AttendanceController.studentCheckIn);

// Lecturer check-in
router.post('/lecturer-check-in', authenticateToken, verifyRole(['lecturer']), AttendanceController.lecturerCheckIn);

// Student history (personal)
router.get('/history', authenticateToken, verifyRole(['student']), AttendanceController.getStudentHistory);

// Class attendance summary (admin/lecturer)
router.get('/class/:classId/summary', authenticateToken, verifyRole(['lecturer', 'admin']), AttendanceController.getClassSummary);

// Student attendance percentage
router.get('/percentage/:courseId', authenticateToken, verifyRole(['student']), AttendanceController.getAttendancePercentage);

module.exports = router;
