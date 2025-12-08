const ClassService = require('../services/ClassService');
const NotificationService = require('../services/NotificationService');
const { sendSuccess, sendError } = require('../utils/helpers');
const pool = require('../config/database');

/**
 * Class Controller
 * Manages classes, schedules, and student enrollments
 */

class ClassController {
  /**
   * Create a new class (Lecturer/Admin action)
   */
  static async createClass(req, res, next) {
    try {
      const { courseCode, courseName, unitCode, semester } = req.body;

      if (!courseCode || !courseName) {
        return sendError(res, 'Course code and name are required', 400);
      }

      const classData = await ClassService.createClass(
        courseCode, courseName, req.user.id, unitCode, semester
      );

      return sendSuccess(res, classData, 'Class created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all classes
   */
  static async getAllClasses(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const classes = await ClassService.getAllClasses(parseInt(limit), parseInt(offset));
      return sendSuccess(res, classes, 'Classes retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get classes by lecturer
   */
  static async getLecturerClasses(req, res, next) {
    try {
      const lecturerId = req.user.id;
      const classes = await ClassService.getClassesByLecturer(lecturerId);
      return sendSuccess(res, classes, 'Lecturer classes retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get class by ID with schedule
   */
  static async getClassById(req, res, next) {
    try {
      const { classId } = req.params;
      const classData = await ClassService.getClassById(classId);

      if (!classData) {
        return sendError(res, 'Class not found', 404);
      }

      return sendSuccess(res, classData, 'Class retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add schedule to a class
   */
  static async addSchedule(req, res, next) {
    try {
      const { classId } = req.params;
      const { dayOfWeek, startTime, endTime, roomNumber } = req.body;

      if (!dayOfWeek || !startTime || !endTime) {
        return sendError(res, 'Missing required schedule fields', 400);
      }

      const schedule = await ClassService.addSchedule(classId, dayOfWeek, startTime, endTime, roomNumber);
      return sendSuccess(res, schedule, 'Schedule added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enroll student in class
   */
  static async enrollStudent(req, res, next) {
    try {
      const { classId } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        return sendError(res, 'Student ID is required', 400);
      }

      const enrollment = await ClassService.enrollStudent(studentId, classId);
      return sendSuccess(res, enrollment, 'Student enrolled successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student's enrolled classes
   */
  static async getStudentClasses(req, res, next) {
    try {
      const studentId = req.user.id;
      const classes = await ClassService.getStudentClasses(studentId);
      return sendSuccess(res, classes, 'Student classes retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reschedule class (Lecturer/Admin action)
   */
  static async rescheduleClass(req, res, next) {
    try {
      const { classId } = req.params;
      const { dayOfWeek, startTime, endTime } = req.body;

      // Get all enrolled students
      const query = `
        SELECT DISTINCT se.student_id 
        FROM student_enrollments se 
        WHERE se.class_id = $1
      `;
      const result = await pool.query(query, [classId]);
      const studentIds = result.rows.map(row => row.student_id);

      // Notify all students
      if (studentIds.length > 0) {
        await NotificationService.broadcastNotification(
          studentIds,
          '📅 Class Rescheduled',
          `Your class has been rescheduled to ${dayOfWeek} ${startTime}-${endTime}`,
          'class_rescheduled',
          classId
        );
      }

      // Emit real-time event
      if (req.io) {
        req.io.to(`class_${classId}`).emit('class:rescheduled', {
          classId, dayOfWeek, startTime, endTime
        });
      }

      return sendSuccess(res, { classId, dayOfWeek, startTime, endTime }, 'Class rescheduled and notifications sent');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel class (Lecturer/Admin action)
   */
  static async cancelClass(req, res, next) {
    try {
      const { classId } = req.params;
      const { reason } = req.body;

      // Get all enrolled students
      const query = `
        SELECT DISTINCT se.student_id 
        FROM student_enrollments se 
        WHERE se.class_id = $1
      `;
      const result = await pool.query(query, [classId]);
      const studentIds = result.rows.map(row => row.student_id);

      // Notify all students
      if (studentIds.length > 0) {
        const message = reason ? `Class cancelled. Reason: ${reason}` : 'Class has been cancelled';
        await NotificationService.broadcastNotification(
          studentIds,
          '❌ Class Cancelled',
          message,
          'class_cancelled',
          classId
        );
      }

      // Emit real-time event
      if (req.io) {
        req.io.to(`class_${classId}`).emit('class:cancelled', {
          classId, reason: reason || null
        });
      }

      return sendSuccess(res, { classId, cancelled: true }, 'Class cancelled and notifications sent');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClassController;
