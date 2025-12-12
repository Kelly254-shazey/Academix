// roster.js
// Class Roster Management Routes
// GET /api/classes/:classId/sessions/:sessionId/roster - Get live roster
// GET /api/classes/:classId/sessions/:sessionId/roster/summary - Get attendance summary
// POST /api/classes/:classId/sessions/:sessionId/roster/mark - Mark single student
// POST /api/classes/:classId/sessions/:sessionId/roster/bulk-mark - Bulk mark students
// GET /api/classes/:classId/roster/at-risk - Get at-risk students
// GET /api/classes/:classId/roster/student/:studentId/history - Get student history
// POST /api/classes/:classId/sessions/:sessionId/attendance/verify - Verify attendance
// POST /api/classes/:classId/sessions/:sessionId/attendance/unverify - Unverify attendance
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router({ mergeParams: true });
const rosterService = require('../services/rosterService');
const attendanceVerificationService = require('../services/attendanceVerificationService');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  attendanceVerificationSchema,
  attendanceUnverifySchema,
  atRiskStudentsSchema,
} = require('../validators/lecturerSchemas');
const logger = require('../utils/logger');

// Middleware: Verify lecturer role
const isLecturer = (req, res, next) => {
  if (req.user.role !== 'lecturer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Lecturer role required.',
    });
  }
  next();
};

/**
 * GET /api/classes/:classId/sessions/:sessionId/roster
 * Get live roster with attendance status
 */
router.get(
  '/:classId/sessions/:sessionId/roster',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;

      const result = await rosterService.getLiveRoster(
        parseInt(classId),
        parseInt(sessionId)
      );

      res.status(200).json({
        success: result.success,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      logger.error('Error fetching roster:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roster',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/sessions/:sessionId/roster/summary
 * Get attendance summary
 */
router.get(
  '/:classId/sessions/:sessionId/roster/summary',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, sessionId } = req.params;

      const result = await rosterService.getAttendanceSummary(
        parseInt(classId),
        parseInt(sessionId)
      );

      res.status(200).json({
        success: result.success,
        data: result.data,
      });
    } catch (error) {
      logger.error('Error fetching roster summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roster summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/roster/mark
 * Mark single student attendance
 */
router.post(
  '/:classId/sessions/:sessionId/roster/mark',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { error, value } = markAttendanceSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        studentId,
        status,
        reason,
        notes,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await rosterService.markStudentAttendance(
        lecturerId,
        classId,
        sessionId,
        studentId,
        status,
        reason,
        notes,
        deviceId,
        deviceFingerprint
      );

      // Emit real-time socket event
      const io = global.io;
      if (io && result.success) {
        io.to(`session_${sessionId}`).emit('attendance-marked', {
          sessionId,
          classId,
          studentId,
          status,
          timestamp: new Date().toISOString(),
          markedBy: lecturerId,
          reason,
          notes
        });

        io.to(`class_${classId}`).emit('roster-updated', {
          classId,
          sessionId,
          updateType: 'single-mark',
          studentId,
          status,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: result.success,
        message: 'Attendance marked successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error marking attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/roster/bulk-mark
 * Bulk mark multiple students
 */
router.post(
  '/:classId/sessions/:sessionId/roster/bulk-mark',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { error, value } = bulkMarkAttendanceSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        markings,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await rosterService.bulkMarkAttendance(
        lecturerId,
        classId,
        sessionId,
        markings,
        deviceId,
        deviceFingerprint
      );

      // Emit real-time socket events for bulk marking
      const io = global.io;
      if (io && result.success) {
        // Notify all clients in the session
        io.to(`session_${sessionId}`).emit('bulk-attendance-marked', {
          sessionId,
          classId,
          markingsCount: markings.length,
          timestamp: new Date().toISOString(),
          markedBy: lecturerId,
          markings: markings.map(m => ({ studentId: m.studentId, status: m.status }))
        });

        // Notify all in class room
        io.to(`class_${classId}`).emit('roster-updated', {
          classId,
          sessionId,
          updateType: 'bulk-mark',
          markingsCount: markings.length,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: result.success,
        message: 'Bulk marking completed',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error bulk marking attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk mark attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/roster/at-risk
 * Get at-risk students (low attendance)
 */
router.get(
  '/:classId/roster/at-risk',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { classId } = req.params;
      const threshold = parseInt(req.query.threshold) || 75;

      const result = await rosterService.getAtRiskStudents(
        parseInt(classId),
        threshold
      );

      res.status(200).json({
        success: result.success,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      logger.error('Error fetching at-risk students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch at-risk students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/classes/:classId/roster/student/:studentId/history
 * Get student attendance history
 */
router.get(
  '/:classId/roster/student/:studentId/history',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { classId, studentId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const result = await rosterService.getStudentAttendanceHistory(
        parseInt(classId),
        parseInt(studentId),
        limit
      );

      res.status(200).json({
        success: result.success,
        data: result.data,
      });
    } catch (error) {
      logger.error('Error fetching student history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/attendance/verify
 * Verify student attendance
 */
router.post(
  '/:classId/sessions/:sessionId/attendance/verify',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { error, value } = attendanceVerificationSchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        classId,
        sessionId,
        studentId,
        attendanceId,
        verificationReason,
        notes,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await attendanceVerificationService.verifyAttendance(
        lecturerId,
        classId,
        sessionId,
        studentId,
        attendanceId,
        verificationReason,
        notes,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Attendance verified successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error verifying attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/classes/:classId/sessions/:sessionId/attendance/unverify
 * Unverify student attendance
 */
router.post(
  '/:classId/sessions/:sessionId/attendance/unverify',
  authenticateToken,
  isLecturer,
  async (req, res) => {
    try {
      const { error, value } = attendanceUnverifySchema.validate({
        classId: parseInt(req.params.classId),
        sessionId: parseInt(req.params.sessionId),
        ...req.body,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
      }

      const {
        attendanceId,
        classId,
        sessionId,
        reason,
        deviceId,
        deviceFingerprint,
      } = value;
      const lecturerId = req.user.id;

      const result = await attendanceVerificationService.unverifyAttendance(
        lecturerId,
        attendanceId,
        classId,
        sessionId,
        reason,
        deviceId,
        deviceFingerprint
      );

      res.status(200).json({
        success: result.success,
        message: 'Attendance unverified successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error('Error unverifying attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unverify attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
