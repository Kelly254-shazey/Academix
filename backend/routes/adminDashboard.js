// admin.js
// Admin dashboard routes: overview, notifications, system status
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const departmentService = require('../services/departmentService');
const lecturerManagementService = require('../services/lecturerManagementService');
const studentManagementService = require('../services/studentManagementService');
const auditService = require('../services/auditService');
const { requireAdminRole, auditAction } = require('../middlewares/rbacMiddleware');
const { validateRequest } = require('../middlewares/validation');
const schemas = require('../validators/adminSchemas');
const logger = require('../utils/logger');

// Middleware: Require admin role for all routes
router.use(requireAdminRole);

/**
 * GET /api/admin/overview
 * Get institution overview dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    const adminId = req.user.id;
    const result = await adminService.getInstitutionOverview(adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting institution overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
    });
  }
});

/**
 * GET /api/admin/notifications
 * Get system notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const adminId = req.user.id;
    const limit = req.query.limit || 50;

    const result = await adminService.getSystemNotifications(adminId, limit);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
});

/**
 * GET /api/admin/dashboard-summary
 * Quick dashboard summary with key metrics
 */
router.get('/dashboard-summary', async (req, res) => {
  try {
    const result = await adminService.getAdminDashboardSummary();

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
    });
  }
});

/**
 * GET /api/admin/kpi-trends
 * Get KPI trends for date range
 */
router.get('/kpi-trends', validateRequest(schemas.dateRangeSchema), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await adminService.getKPITrends(startDate, endDate);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting KPI trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KPI trends',
    });
  }
});

/**
 * GET /api/admin/departments
 * Get all departments
 */
router.get('/departments', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      is_active: req.query.is_active,
    };

    const result = await departmentService.getAllDepartments(filters);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
    });
  }
});

/**
 * GET /api/admin/departments/:departmentId
 * Get department details
 */
router.get('/departments/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const result = await departmentService.getDepartmentDetails(departmentId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching department details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department details',
    });
  }
});

/**
 * POST /api/admin/departments
 * Create new department
 */
router.post('/departments', validateRequest(schemas.createDepartmentSchema), auditAction('department', 'create'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const result = await departmentService.createDepartment(req.body, adminId);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create department',
    });
  }
});

/**
 * PATCH /api/admin/departments/:departmentId
 * Update department
 */
router.patch('/departments/:departmentId', validateRequest(schemas.updateDepartmentSchema), auditAction('department', 'update'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const adminId = req.user.id;

    const result = await departmentService.updateDepartment(departmentId, req.body, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
    });
  }
});

/**
 * POST /api/admin/departments/:departmentId/assign-hod
 * Assign HOD to department
 */
router.post('/departments/:departmentId/assign-hod', validateRequest(schemas.assignHODSchema), auditAction('department', 'assign_hod'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { hod_user_id } = req.body;
    const adminId = req.user.id;

    const result = await departmentService.assignHOD(departmentId, hod_user_id, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error assigning HOD:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign HOD',
    });
  }
});

/**
 * DELETE /api/admin/departments/:departmentId
 * Delete department
 */
router.delete('/departments/:departmentId', auditAction('department', 'delete'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const adminId = req.user.id;

    const result = await departmentService.deleteDepartment(departmentId, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete department',
    });
  }
});

/**
 * GET /api/admin/lecturers
 * Get all lecturers
 */
router.get('/lecturers', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      department_id: req.query.department_id,
      is_active: req.query.is_active,
    };

    const result = await lecturerManagementService.getAllLecturers(filters);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching lecturers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecturers',
    });
  }
});

/**
 * GET /api/admin/lecturers/:lecturerId
 * Get lecturer profile
 */
router.get('/lecturers/:lecturerId', async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const result = await lecturerManagementService.getLecturerProfile(lecturerId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching lecturer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecturer profile',
    });
  }
});

/**
 * POST /api/admin/lecturers
 * Create new lecturer
 */
router.post('/lecturers', validateRequest(schemas.createLecturerSchema), auditAction('lecturer', 'create'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const result = await lecturerManagementService.createLecturer(req.body, adminId);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating lecturer:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create lecturer',
    });
  }
});

/**
 * PATCH /api/admin/lecturers/:lecturerId
 * Update lecturer
 */
router.patch('/lecturers/:lecturerId', validateRequest(schemas.updateLecturerSchema), auditAction('lecturer', 'update'), async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const adminId = req.user.id;

    const result = await lecturerManagementService.updateLecturer(lecturerId, req.body, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating lecturer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lecturer',
    });
  }
});

/**
 * POST /api/admin/lecturers/:lecturerId/deactivate
 * Deactivate lecturer
 */
router.post('/lecturers/:lecturerId/deactivate', auditAction('lecturer', 'deactivate'), async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const adminId = req.user.id;

    const result = await lecturerManagementService.deactivateLecturer(lecturerId, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error deactivating lecturer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate lecturer',
    });
  }
});

/**
 * GET /api/admin/students
 * Get all students
 */
router.get('/students', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      department_id: req.query.department_id,
      is_active: req.query.is_active,
      flagged: req.query.flagged,
    };

    const result = await studentManagementService.getAllStudents(filters);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
});

/**
 * GET /api/admin/students/:studentId
 * Get student profile
 */
router.get('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await studentManagementService.getStudentProfile(studentId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile',
    });
  }
});

/**
 * POST /api/admin/students
 * Create new student
 */
router.post('/students', validateRequest(schemas.createStudentSchema), auditAction('student', 'create'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const result = await studentManagementService.createStudent(req.body, adminId);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create student',
    });
  }
});

/**
 * PATCH /api/admin/students/:studentId
 * Update student
 */
router.patch('/students/:studentId', validateRequest(schemas.updateStudentSchema), auditAction('student', 'update'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminId = req.user.id;

    const result = await studentManagementService.updateStudent(studentId, req.body, adminId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
    });
  }
});

/**
 * POST /api/admin/students/:studentId/flag
 * Flag student
 */
router.post('/students/:studentId/flag', validateRequest(schemas.flagStudentSchema), auditAction('student', 'flag'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { flag_type, severity, description } = req.body;
    const adminId = req.user.id;

    const result = await studentManagementService.flagStudent(
      studentId, flag_type, severity, description, adminId
    );

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error flagging student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag student',
    });
  }
});

/**
 * POST /api/admin/students/:studentId/transfer
 * Transfer student to another department
 */
router.post('/students/:studentId/transfer', validateRequest(schemas.transferStudentSchema), auditAction('student', 'transfer'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { to_department_id, reason } = req.body;
    const adminId = req.user.id;

    const result = await studentManagementService.transferStudent(
      studentId, to_department_id, reason, adminId
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error transferring student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer student',
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 */
router.get('/audit-logs', validateRequest(schemas.auditLogsFilterSchema), async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      resource_type: req.query.resource_type,
      severity: req.query.severity,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    };

    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const result = await auditService.getAuditLogs(filters, limit, offset);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
    });
  }
});

/**
 * GET /api/admin/compliance-report
 * Get compliance report for date range
 */
router.get('/compliance-report', validateRequest(schemas.dateRangeSchema), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await auditService.getComplianceReport(startDate, endDate);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
    });
  }
});

/**
 * GET /api/admin/export-audit-logs
 * Export audit logs
 */
router.get('/export-audit-logs', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      user_id: req.query.user_id,
      severity: req.query.severity,
    };

    const format = req.query.format || 'json';
    const result = await auditService.exportAuditLogs(filters, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } else {
      res.json(result);
    }
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
    });
  }
});

module.exports = router;
