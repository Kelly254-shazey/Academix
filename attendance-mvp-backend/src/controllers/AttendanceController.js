const AttendanceService = require('../services/AttendanceService');
const ClassService = require('../services/ClassService');
const NotificationService = require('../services/NotificationService');
const { sendSuccess, sendError, getCurrentDate } = require('../utils/helpers');

/**
 * Attendance Controller
 * Handles marking and retrieving attendance records
 */

class AttendanceController {
  /**
   * Mark attendance for a student (Lecturer action)
   */
  static async markAttendance(req, res, next) {
    try {
      const { studentId, classId, status, notes } = req.body;

      if (!studentId || !classId || !status) {
        return sendError(res, 'Missing required fields', 400);
      }

      const validStatuses = ['present', 'absent', 'late', 'excused'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 'Invalid attendance status', 400);
      }

      const attendance = await AttendanceService.markAttendance(
        studentId, classId, status, req.user.id, notes
      );

      // Create notification for student
      const notificationTitle = status === 'present' ? '✅ Attendance Marked' : '⚠️ Attendance Recorded';
      const notificationMessage = `Your attendance for class has been marked as ${status}`;
      
      await NotificationService.createNotification(
        studentId, notificationTitle, notificationMessage, 'attendance_marked', classId
      );

      // Emit real-time event to socket
      if (req.io) {
        req.io.to(`class_${classId}`).emit('attendance:marked', {
          studentId, classId, status, markedAt: new Date()
        });
        req.io.to(`user_${studentId}`).emit('notification:new', {
          title: notificationTitle, message: notificationMessage
        });
      }

      return sendSuccess(res, attendance, 'Attendance marked successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance records for a class
   */
  static async getClassAttendance(req, res, next) {
    try {
      const { classId } = req.params;
      const { startDate, endDate } = req.query;

      const attendance = await AttendanceService.getClassAttendance(classId, startDate, endDate);
      return sendSuccess(res, attendance, 'Attendance records retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance records for a student
   */
  static async getStudentAttendance(req, res, next) {
    try {
      const { studentId } = req.params;
      const { classId } = req.query;

      const attendance = await AttendanceService.getStudentAttendance(studentId, classId);
      return sendSuccess(res, attendance, 'Student attendance retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance statistics
   */
  static async getAttendanceStats(req, res, next) {
    try {
      const { studentId, classId } = req.params;

      const stats = await AttendanceService.getAttendanceStats(studentId, classId);
      return sendSuccess(res, stats, 'Attendance statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AttendanceController;
