// classSessionService.js
// Manage class sessions: start, delay, cancel, change room
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class ClassSessionService {
  /**
   * Start a class session
   */
  async startSession(classId, sessionId, lecturerId, deviceId, deviceFingerprint) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Update session
      const updateQuery = `
        UPDATE sessions
        SET status = 'in_progress',
            scanning_enabled = TRUE,
            session_token = ?,
            started_by = ?,
            started_at = NOW()
        WHERE id = ? AND class_id = ?
      `;

      const [result] = await db.execute(updateQuery, [sessionToken, lecturerId, sessionId, classId]);

      if (result.affectedRows === 0) {
        throw new Error('Session not found or already started');
      }

      // Log to audit table
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'SESSION_STARTED',
        resource_type: 'session',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: {
          status: 'in_progress',
          scanning_enabled: true,
          started_at: new Date().toISOString(),
        },
      });

      logger.info(`Session ${sessionId} started by lecturer ${lecturerId}`);

      return {
        success: true,
        data: {
          sessionId,
          classId,
          status: 'in_progress',
          scanningEnabled: true,
          sessionToken,
          startedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in startSession:', error);
      throw error;
    }
  }

  /**
   * Delay a class session
   */
  async delaySession(classId, sessionId, lecturerId, delayMinutes, reason, deviceId, deviceFingerprint) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const newStartTime = new Date(Date.now() + delayMinutes * 60000);

      const updateQuery = `
        UPDATE sessions
        SET delayed_by = ?,
            delay_reason = ?,
            delayed_at = NOW(),
            new_start_time = ?
        WHERE id = ? AND class_id = ?
      `;

      const [result] = await db.execute(updateQuery, [lecturerId, reason, newStartTime, sessionId, classId]);

      if (result.affectedRows === 0) {
        throw new Error('Session not found');
      }

      // Log to audit table
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'SESSION_DELAYED',
        resource_type: 'session',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: {
          delay_minutes: delayMinutes,
          delay_reason: reason,
          new_start_time: newStartTime.toISOString(),
        },
      });

      logger.info(`Session ${sessionId} delayed by ${delayMinutes} minutes`);

      return {
        success: true,
        data: {
          sessionId,
          classId,
          delayMinutes,
          reason,
          newStartTime: newStartTime.toISOString(),
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in delaySession:', error);
      throw error;
    }
  }

  /**
   * Cancel a class session
   */
  async cancelSession(classId, sessionId, lecturerId, reason, deviceId, deviceFingerprint) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE sessions
        SET status = 'cancelled',
            cancelled_by = ?,
            cancellation_reason = ?,
            cancelled_at = NOW(),
            scanning_enabled = FALSE
        WHERE id = ? AND class_id = ?
      `;

      const [result] = await db.execute(updateQuery, [lecturerId, reason, sessionId, classId]);

      if (result.affectedRows === 0) {
        throw new Error('Session not found');
      }

      // Log to audit table
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'SESSION_CANCELLED',
        resource_type: 'session',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: {
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        },
      });

      logger.info(`Session ${sessionId} cancelled. Reason: ${reason}`);

      return {
        success: true,
        data: {
          sessionId,
          classId,
          status: 'cancelled',
          reason,
          cancelledAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in cancelSession:', error);
      throw error;
    }
  }

  /**
   * Change class room
   */
  async changeRoom(classId, sessionId, lecturerId, newRoom, oldRoom, deviceId, deviceFingerprint) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE sessions
        SET room_change_from = ?,
            room_change_to = ?,
            room_changed_by = ?,
            room_changed_at = NOW()
        WHERE id = ? AND class_id = ?
      `;

      const [result] = await db.execute(updateQuery, [oldRoom, newRoom, lecturerId, sessionId, classId]);

      if (result.affectedRows === 0) {
        throw new Error('Session not found');
      }

      // Log to audit table
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'ROOM_CHANGED',
        resource_type: 'session',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        old_value: { room: oldRoom },
        new_value: { room: newRoom },
      });

      logger.info(`Session ${sessionId} room changed from ${oldRoom} to ${newRoom}`);

      return {
        success: true,
        data: {
          sessionId,
          classId,
          oldRoom,
          newRoom,
          changedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in changeRoom:', error);
      throw error;
    }
  }

  /**
   * Toggle scanning for a session (manual control)
   */
  async toggleScanning(classId, sessionId, lecturerId, enabled, deviceId, deviceFingerprint) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const updateQuery = `
        UPDATE sessions
        SET scanning_enabled = ?
        WHERE id = ? AND class_id = ?
      `;

      const [result] = await db.execute(updateQuery, [enabled, sessionId, classId]);

      if (result.affectedRows === 0) {
        throw new Error('Session not found');
      }

      // Log to audit table
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: enabled ? 'SCANNING_ENABLED' : 'SCANNING_DISABLED',
        resource_type: 'session',
        resource_id: sessionId,
        class_id: classId,
        session_id: sessionId,
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
        new_value: { scanning_enabled: enabled },
      });

      logger.info(`Session ${sessionId} scanning ${enabled ? 'enabled' : 'disabled'}`);

      return {
        success: true,
        data: {
          sessionId,
          classId,
          scanningEnabled: enabled,
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in toggleScanning:', error);
      throw error;
    }
  }

  /**
   * Get session state
   */
  async getSessionState(classId, sessionId) {
    try {

      const query = `
        SELECT 
          id, class_id, status, scanning_enabled, session_token,
          started_by, started_at, delayed_by, delay_reason, delayed_at,
          new_start_time, cancelled_by, cancellation_reason, cancelled_at,
          room_change_from, room_change_to, room_changed_by, room_changed_at
        FROM sessions
        WHERE id = ? AND class_id = ?
      `;

      const [results] = await db.execute(query, [sessionId, classId]);

      if (!results || results.length === 0) {
        throw new Error('Session not found');
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      logger.error('Error in getSessionState:', error);
      throw error;
    }
  }

  /**
   * Audit log helper
   */
  async auditLog(conn, data) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, class_id, session_id,
        old_value, new_value, device_id, device_fingerprint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success')
    `;

    try {
      await db.execute(query, [
        data.user_id,
        data.action,
        data.resource_type,
        data.resource_id,
        data.class_id,
        data.session_id,
        data.old_value ? JSON.stringify(data.old_value) : null,
        data.new_value ? JSON.stringify(data.new_value) : null,
        data.device_id,
        data.device_fingerprint,
      ]);
    } catch (error) {
      logger.error('Error logging audit:', error);
    }
  }

  /**
   * Generate session token
   */
  generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

module.exports = new ClassSessionService();
