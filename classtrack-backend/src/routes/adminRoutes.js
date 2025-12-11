/**
 * Admin Routes
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { verifyRole } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

// At-risk students
router.get('/at-risk-students', AdminController.getAtRiskStudents);

// Security alerts
router.get('/security-alerts', AdminController.getSecurityAlerts);

// User management
router.post('/users', AdminController.createUser);

// Reports
router.get('/reports/attendance-export', AdminController.exportAttendanceReport);

module.exports = router;
