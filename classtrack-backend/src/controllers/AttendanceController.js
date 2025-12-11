/**
 * Attendance Controller
 * Handles check-in endpoints and attendance queries
 */

const AttendanceService = require('../services/AttendanceService');

class AttendanceController {
  /**
   * Student check-in endpoint
   * POST /api/attendance/check-in
   */
  static async studentCheckIn(req, res) {
    try {
      const studentId = req.user.userId;
      const { sessionId, qrData, gpsData, fingerprint } = req.body;

      if (!sessionId || !qrData || !gpsData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const result = await AttendanceService.studentCheckIn(
        sessionId,
        studentId,
        qrData,
        gpsData,
        fingerprint,
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (err) {
      console.error('Student check-in error:', err);
      res.status(500).json({
        success: false,
        error: 'Check-in failed',
      });
    }
  }

  /**
   * Lecturer check-in endpoint
   * POST /api/attendance/lecturer-check-in
   */
  static async lecturerCheckIn(req, res) {
    try {
      const lecturerId = req.user.userId;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID required',
        });
      }

      const result = await AttendanceService.lecturerCheckIn(sessionId, lecturerId);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (err) {
      console.error('Lecturer check-in error:', err);
      res.status(500).json({
        success: false,
        error: 'Check-in failed',
      });
    }
  }

  /**
   * Get student attendance history
   * GET /api/attendance/history
   */
  static async getStudentHistory(req, res) {
    try {
      const studentId = req.user.userId;
      const { limit = 50, offset = 0 } = req.query;

      const result = await AttendanceService.getStudentAttendance(studentId, limit, offset);

      res.json(result);
    } catch (err) {
      console.error('Get student history error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch history',
      });
    }
  }

  /**
   * Get class attendance summary
   * GET /api/attendance/class/:classId/summary
   */
  static async getClassSummary(req, res) {
    try {
      const { classId } = req.params;

      const result = await AttendanceService.getClassAttendance(classId);

      res.json(result);
    } catch (err) {
      console.error('Get class summary error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch summary',
      });
    }
  }

  /**
   * Get attendance percentage for student in course
   * GET /api/attendance/percentage/:courseId
   */
  static async getAttendancePercentage(req, res) {
    try {
      const studentId = req.user.userId;
      const { courseId } = req.params;

      const result = await AttendanceService.getAttendancePercentage(studentId, courseId);

      res.json(result);
    } catch (err) {
      console.error('Get attendance percentage error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch percentage',
      });
    }
  }
}

module.exports = AttendanceController;
