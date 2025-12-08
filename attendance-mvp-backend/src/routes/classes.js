const express = require('express');
const ClassController = require('../controllers/ClassController');
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * Class Routes
 * POST   /classes               - Create class (Lecturer/Admin)
 * GET    /classes               - Get all classes
 * GET    /classes/lecturer      - Get lecturer's classes
 * GET    /classes/:classId      - Get class details
 * POST   /classes/:classId/schedule - Add schedule
 * POST   /classes/:classId/enroll - Enroll student
 * GET    /classes/student/my-classes - Get student's classes
 * POST   /classes/:classId/reschedule - Reschedule class
 * POST   /classes/:classId/cancel - Cancel class
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create class (Lecturer/Admin)
router.post('/', authorize('lecturer', 'admin'), ClassController.createClass);

// Get all classes
router.get('/', ClassController.getAllClasses);

// Get lecturer's classes
router.get('/lecturer/my-classes', authorize('lecturer'), ClassController.getLecturerClasses);

// Get student's classes
router.get('/student/my-classes', authorize('student'), ClassController.getStudentClasses);

// Get class by ID
router.get('/:classId', ClassController.getClassById);

// Add schedule to class
router.post('/:classId/schedule', authorize('lecturer', 'admin'), ClassController.addSchedule);

// Enroll student
router.post('/:classId/enroll', authorize('admin'), ClassController.enrollStudent);

// Reschedule class
router.post('/:classId/reschedule', authorize('lecturer', 'admin'), ClassController.rescheduleClass);

// Cancel class
router.post('/:classId/cancel', authorize('lecturer', 'admin'), ClassController.cancelClass);

module.exports = router;
