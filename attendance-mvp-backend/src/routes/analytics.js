const express = require('express');
const AnalyticsController = require('../controllers/AnalyticsController');
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * Analytics Routes
 * GET    /analytics/student/:studentId/:classId - Student report
 * GET    /analytics/class/:classId - Class attendance report
 * GET    /analytics/trends/:classId - Weekly trends
 * GET    /analytics/lecturer/overview - Lecturer overview
 * GET    /analytics/admin/overview - Platform overview (Admin)
 * GET    /analytics/export/csv/:classId - Export as CSV
 * GET    /analytics/export/pdf/:classId - Export as PDF
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Student report
router.get('/student/:studentId/:classId', AnalyticsController.getStudentReport);

// Class report
router.get('/class/:classId', AnalyticsController.getClassReport);

// Weekly trends
router.get('/trends/:classId', AnalyticsController.getWeeklyTrends);

// Lecturer overview
router.get('/lecturer/overview', authorize('lecturer'), AnalyticsController.getLecturerOverview);

// Admin overview
router.get('/admin/overview', authorize('admin'), AnalyticsController.getPlatformOverview);

// Export routes
router.get('/export/csv/:classId', AnalyticsController.exportAsCSV);
router.get('/export/pdf/:classId', AnalyticsController.exportAsPDF);

module.exports = router;
