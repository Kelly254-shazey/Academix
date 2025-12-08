/**
 * Class Controller
 * Manages class CRUD, sessions, and scheduling
 */

const ClassService = require('../services/ClassService');

class ClassController {
  /**
   * Create new class
   * POST /api/classes
   */
  static async createClass(req, res) {
    try {
      const { course_code, course_name, department_id, day_of_week, start_time, end_time, location_name, location_lat, location_lng, geofence_radius_meters } = req.body;

      const classData = {
        course_code,
        course_name,
        lecturer_id: req.user.userId,
        department_id,
        day_of_week,
        start_time,
        end_time,
        location_name,
        location_lat,
        location_lng,
        geofence_radius_meters,
      };

      const result = await ClassService.createClass(classData);

      res.status(201).json(result);
    } catch (err) {
      console.error('Create class error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create class',
      });
    }
  }

  /**
   * Start class session
   * POST /api/classes/:classId/start-session
   */
  static async startSession(req, res) {
    try {
      const { classId } = req.params;
      const lecturerId = req.user.userId;

      const result = await ClassService.startSession(classId, lecturerId);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (err) {
      console.error('Start session error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to start session',
      });
    }
  }

  /**
   * End class session
   * POST /api/classes/:classId/sessions/:sessionId/end
   */
  static async endSession(req, res) {
    try {
      const { sessionId } = req.params;
      const lecturerId = req.user.userId;

      const result = await ClassService.endSession(sessionId, lecturerId);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (err) {
      console.error('End session error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to end session',
      });
    }
  }

  /**
   * Cancel class session
   * POST /api/classes/:classId/sessions/:sessionId/cancel
   */
  static async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;
      const cancelledBy = req.user.userId;

      const result = await ClassService.cancelSession(sessionId, reason, cancelledBy);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (err) {
      console.error('Cancel session error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel session',
      });
    }
  }

  /**
   * Get lecturer's classes
   * GET /api/classes/my-classes
   */
  static async getMyClasses(req, res) {
    try {
      const lecturerId = req.user.userId;

      const result = await ClassService.getLecturerClasses(lecturerId);

      res.json(result);
    } catch (err) {
      console.error('Get my classes error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classes',
      });
    }
  }

  /**
   * Get upcoming sessions for class
   * GET /api/classes/:classId/upcoming-sessions
   */
  static async getUpcomingSessions(req, res) {
    try {
      const { classId } = req.params;
      const { daysAhead = 30 } = req.query;

      const result = await ClassService.getUpcomingSessions(classId, daysAhead);

      res.json(result);
    } catch (err) {
      console.error('Get upcoming sessions error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
      });
    }
  }
}

module.exports = ClassController;
