// routes/reportsRoutes.js
// Reports and export endpoints
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router();
const reportingService = require('../services/reportingService');
const authMiddleware = require('../middleware/auth');
const { requireRole, requirePermission, auditAction } = require('../middlewares/rbacMiddleware');
const { exportJobSchema, reportRequestSchema } = require('../validators/adminSchemas');
const logger = require('../utils/logger');

// Student reports endpoint - accessible to all authenticated users
/**
 * GET /api/reports/student
 * Get student attendance reports and analytics
 */
router.get('/student', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || 'month'; // week, month, semester, year
    const attendanceAnalyticsService = require('../services/attendanceAnalyticsService');
    
    // Get student's attendance per course
    const courseAttendance = await attendanceAnalyticsService.getAttendancePerCourse(req.user.id);
    
    // Get overall attendance
    const overallAttendance = await attendanceAnalyticsService.getOverallAttendance(req.user.id);
    
    // Get analytics with trends
    const analytics = await attendanceAnalyticsService.getAttendanceAnalytics(
      req.user.id,
      null, // start_date - null means default range
      null  // end_date
    );
    
    // Get low attendance warnings
    const lowAttendance = await attendanceAnalyticsService.checkLowAttendanceThreshold(req.user.id, 75);
    
    // Get missed classes
    const missedClasses = await attendanceAnalyticsService.getMissedClasses(req.user.id, 10);
    
    res.json({
      success: true,
      reports: {
        period,
        courseAttendance,
        overallAttendance,
        analytics,
        lowAttendanceAlerts: lowAttendance,
        recentMissedClasses: missedClasses,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error fetching student reports:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// All other report routes require admin role
router.use(requireRole(['admin', 'superadmin']));

/**
 * POST /api/reports/export-job
 * Create new export/report job
 */
router.post('/export-job',
  requirePermission('manage_reports'),
  auditAction('CREATE', 'export_job'),
  async (req, res) => {
    try {
      const { error } = exportJobSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details,
        });
      }

      const { reportType, format, filters, recipientEmail } = req.body;
      const result = await reportingService.createExportJob(
        reportType,
        format,
        filters || {},
        recipientEmail,
        req.user.id
      );

      // Emit Socket.IO event
      if (req.io) {
        req.io.emit('export-job-started', {
          jobId: result.data.jobId,
          reportType,
          timestamp: new Date(),
        });
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /export-job:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/reports/export-job/:jobId
 * Get status of export job
 */
router.get('/export-job/:jobId',
  requirePermission('view_reports'),
  async (req, res) => {
    try {
      const result = await reportingService.getExportJobStatus(req.params.jobId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /export-job/:jobId:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/reports/export-jobs
 * List all export jobs with pagination and filters
 */
router.get('/export-jobs',
  requirePermission('view_reports'),
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        reportType: req.query.reportType,
        createdBy: req.query.createdBy,
      };

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;

      const result = await reportingService.listExportJobs(
        filters,
        limit,
        offset
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /export-jobs:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/reports/attendance-report
 * Generate attendance report
 */
router.post('/attendance-report',
  requirePermission('manage_reports'),
  auditAction('CREATE', 'attendance_report'),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, departmentId, format = 'pdf' } = req.body;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'dateFrom and dateTo are required',
        });
      }

      const result = await reportingService.generateAttendanceReport(
        dateFrom,
        dateTo,
        departmentId || null,
        format,
        req.user.id
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /attendance-report:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/reports/department-report
 * Generate department analytics report
 */
router.post('/department-report',
  requirePermission('manage_reports'),
  auditAction('CREATE', 'department_report'),
  async (req, res) => {
    try {
      const { departmentId, format = 'pdf', includeMetrics = true } = req.body;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'departmentId is required',
        });
      }

      const result = await reportingService.generateDepartmentReport(
        departmentId,
        format,
        includeMetrics,
        req.user.id
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /department-report:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/reports/export-job/:jobId
 * Cancel export job
 */
router.delete('/export-job/:jobId',
  requirePermission('manage_reports'),
  auditAction('DELETE', 'export_job'),
  async (req, res) => {
    try {
      const result = await reportingService.cancelExportJob(req.params.jobId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in DELETE /export-job/:jobId:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;
