/**
 * Class Management Service
 * Manages course scheduling, sessions, and status
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const QRService = require('./QRService');

class ClassService {
  /**
   * Create a new class
   */
  static async createClass(classData) {
    try {
      const classId = uuidv4();
      const now = new Date();

      const result = await db.query(
        `INSERT INTO classes 
         (id, course_code, course_name, lecturer_id, department_id, day_of_week,
          start_time, end_time, location_name, location_lat, location_lng, 
          geofence_radius_meters, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          classId,
          classData.course_code,
          classData.course_name,
          classData.lecturer_id,
          classData.department_id,
          classData.day_of_week,
          classData.start_time,
          classData.end_time,
          classData.location_name,
          classData.location_lat,
          classData.location_lng,
          classData.geofence_radius_meters || 100,
          now,
        ],
      );

      return {
        success: true,
        class: result.rows[0],
        message: 'Class created successfully',
      };
    } catch (err) {
      console.error('Create class error:', err);
      throw err;
    }
  }

  /**
   * Start class session (generates QR code)
   */
  static async startSession(classId, lecturerId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Verify lecturer owns this class
      const classCheck = await client.query(
        'SELECT * FROM classes WHERE id = $1 AND lecturer_id = $2',
        [classId, lecturerId],
      );

      if (classCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Class not found or unauthorized',
        };
      }

      // Create session
      const sessionId = uuidv4();
      const now = new Date();
      const sessionDate = now.toISOString().split('T')[0];

      const result = await client.query(
        `INSERT INTO class_sessions 
         (id, class_id, session_date, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sessionId, classId, sessionDate, 'ongoing', now],
      );

      // Generate QR code for this session
      const qrResult = await QRService.generateQRCode(sessionId, 45);

      await client.query('COMMIT');

      return {
        success: true,
        session: result.rows[0],
        qr: qrResult,
        message: 'Class session started',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Start session error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * End class session
   */
  static async endSession(sessionId, lecturerId) {
    try {
      const now = new Date();

      const result = await db.query(
        `UPDATE class_sessions 
         SET status = 'completed'
         WHERE id = $1
         RETURNING *`,
        [sessionId],
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      return {
        success: true,
        session: result.rows[0],
        message: 'Class session ended',
      };
    } catch (err) {
      console.error('End session error:', err);
      throw err;
    }
  }

  /**
   * Cancel class session
   */
  static async cancelSession(sessionId, reason, cancelledBy) {
    try {
      const result = await db.query(
        `UPDATE class_sessions 
         SET status = 'cancelled', cancellation_reason = $1
         WHERE id = $2
         RETURNING *`,
        [reason, sessionId],
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      // TODO: Send notifications to all enrolled students

      return {
        success: true,
        session: result.rows[0],
        message: 'Class cancelled and students notified',
      };
    } catch (err) {
      console.error('Cancel session error:', err);
      throw err;
    }
  }

  /**
   * Get lecturer's classes
   */
  static async getLecturerClasses(lecturerId) {
    try {
      const result = await db.query(
        `SELECT * FROM classes 
         WHERE lecturer_id = $1
         ORDER BY day_of_week, start_time`,
        [lecturerId],
      );

      return {
        success: true,
        classes: result.rows,
      };
    } catch (err) {
      console.error('Get lecturer classes error:', err);
      throw err;
    }
  }

  /**
   * Get all upcoming sessions for a class
   */
  static async getUpcomingSessions(classId, daysAhead = 30) {
    try {
      const result = await db.query(
        `SELECT * FROM class_sessions 
         WHERE class_id = $1 
         AND session_date >= CURRENT_DATE
         AND session_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
         ORDER BY session_date`,
        [classId],
      );

      return {
        success: true,
        sessions: result.rows,
      };
    } catch (err) {
      console.error('Get upcoming sessions error:', err);
      throw err;
    }
  }
}

module.exports = ClassService;
