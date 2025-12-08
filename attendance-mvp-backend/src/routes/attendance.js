const express = require('express');
const AttendanceController = require('../controllers/AttendanceController');
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * Attendance Routes
 * POST   /attendance/mark             - Mark attendance (Lecturer/Admin)
 * GET    /attendance/class/:classId   - Get class attendance records
 * GET    /attendance/student/:studentId - Get student attendance
 * GET    /attendance/stats/:studentId/:classId - Get attendance stats
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Mark attendance (Lecturer/Admin only)
router.post('/mark', authorize('lecturer', 'admin'), AttendanceController.markAttendance);

// Get attendance records
router.get('/class/:classId', AttendanceController.getClassAttendance);
router.get('/student/:studentId', AttendanceController.getStudentAttendance);
router.get('/stats/:studentId/:classId', AttendanceController.getAttendanceStats);

module.exports = router;
