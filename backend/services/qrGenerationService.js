// qrGenerationService.js
// QR code generation, rotation, and validation for lecturer-enabled check-ins
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const crypto = require('crypto');
const logger = require('../utils/logger');

class QRGenerationService {
  /**
   * Generate QR code for student check-in
   */
  async generateQR(classId, sessionId, lecturerId, options = {}) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Verify session belongs to lecturer's class and is started
      const sessionQuery = `
        SELECT s.id, s.scanning_enabled, c.lecturer_id
        FROM sessions s
        JOIN classes c ON s.class_id = c.id
        WHERE s.id = ? AND s.class_id = ? AND c.lecturer_id = ? AND s.status = 'in_progress'
      `;

      const [sessionResults] = await conn.query(sessionQuery, [sessionId, classId, lecturerId]);

      if (!sessionResults || sessionResults.length === 0) {
        throw new Error('Session not found or not in progress');
      }

      if (!sessionResults[0].scanning_enabled) {
        throw new Error('Scanning is not enabled for this session');
      }

      // Generate QR token and signature
      const qrToken = this.generateQRToken();
      const signature = this.generateSignature(qrToken, sessionId, classId);
      const expiresAt = new Date(Date.now() + (options.validitySeconds || 35) * 1000); // Default 35 seconds

      // Insert QR record
      const insertQuery = `
        INSERT INTO qr_generations (
          session_id, class_id, qr_token, qr_signature, generated_by,
          expires_at, rotation_index
        ) VALUES (?, ?, ?, ?, ?, ?, 0)
      `;

      const [result] = await conn.query(insertQuery, [
        sessionId,
        classId,
        qrToken,
        signature,
        lecturerId,
        expiresAt,
      ]);

      // Log audit
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'QR_GENERATED',
        resource_type: 'qr_code',
        resource_id: result.insertId,
        class_id: classId,
        session_id: sessionId,
        new_value: {
          qr_token: qrToken,
          expires_at: expiresAt.toISOString(),
          validity_seconds: options.validitySeconds || 35,
        },
      });

      conn.end();

      logger.info(`QR generated for session ${sessionId} by lecturer ${lecturerId}`);

      return {
        success: true,
        data: {
          qrToken,
          signature,
          sessionId,
          classId,
          expiresAt: expiresAt.toISOString(),
          validitySeconds: options.validitySeconds || 35,
          qrPayload: {
            token: qrToken,
            sessionId,
            classId,
            expiresAt: expiresAt.toISOString(),
            signature,
          },
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in generateQR:', error);
      throw error;
    }
  }

  /**
   * Rotate QR code (generate new token while invalidating old)
   */
  async rotateQR(classId, sessionId, lecturerId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Get current QR
      const currentQuery = `
        SELECT id, rotation_index FROM qr_generations
        WHERE session_id = ? AND class_id = ? AND expires_at > NOW()
        ORDER BY generated_at DESC LIMIT 1
      `;

      const [currentResults] = await conn.query(currentQuery, [sessionId, classId]);

      if (!currentResults || currentResults.length === 0) {
        throw new Error('No active QR found to rotate');
      }

      const newRotationIndex = (currentResults[0].rotation_index || 0) + 1;

      // Generate new QR
      const newQRToken = this.generateQRToken();
      const newSignature = this.generateSignature(newQRToken, sessionId, classId);
      const expiresAt = new Date(Date.now() + 10 * 60000);

      const insertQuery = `
        INSERT INTO qr_generations (
          session_id, class_id, qr_token, qr_signature, generated_by,
          expires_at, is_rotated, rotation_index
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `;

      const [result] = await conn.query(insertQuery, [
        sessionId,
        classId,
        newQRToken,
        newSignature,
        lecturerId,
        expiresAt,
        newRotationIndex,
      ]);

      // Log audit
      await this.auditLog(conn, {
        user_id: lecturerId,
        action: 'QR_ROTATED',
        resource_type: 'qr_code',
        resource_id: result.insertId,
        class_id: classId,
        session_id: sessionId,
        new_value: {
          rotation_index: newRotationIndex,
          qr_token: newQRToken,
        },
      });

      conn.end();

      logger.info(`QR rotated for session ${sessionId}`);

      return {
        success: true,
        data: {
          qrToken: newQRToken,
          signature: newSignature,
          rotationIndex: newRotationIndex,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      if (conn) conn.end();
      logger.error('Error in rotateQR:', error);
      throw error;
    }
  }

  /**
   * Get current active QR for session
   */
  async getActiveQR(classId, sessionId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT id, qr_token, qr_signature, generated_at, expires_at,
               scanned_count, rotation_index
        FROM qr_generations
        WHERE session_id = ? AND class_id = ? AND expires_at > NOW()
        ORDER BY generated_at DESC LIMIT 1
      `;

      const [results] = await conn.query(query, [sessionId, classId]);
      conn.end();

      return {
        success: true,
        data: results && results.length > 0 ? results[0] : null,
      };
    } catch (error) {
      logger.error('Error in getActiveQR:', error);
      throw error;
    }
  }

  /**
   * Validate QR token
   */
  async validateQRToken(qrToken, signature, sessionId, classId) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Verify signature
      const expectedSignature = this.generateSignature(qrToken, sessionId, classId);
      if (signature !== expectedSignature) {
        conn.end();
        return {
          valid: false,
          reason: 'Invalid signature',
        };
      }

      // Check QR exists and is valid
      const query = `
        SELECT id, expires_at FROM qr_generations
        WHERE qr_token = ? AND session_id = ? AND class_id = ?
        AND expires_at > NOW()
      `;

      const [results] = await conn.query(query, [qrToken, sessionId, classId]);

      // Update scan count
      if (results && results.length > 0) {
        await conn.query(
          'UPDATE qr_generations SET scanned_count = scanned_count + 1 WHERE id = ?',
          [results[0].id]
        );
      }

      conn.end();

      if (!results || results.length === 0) {
        return {
          valid: false,
          reason: 'QR token not found or expired',
        };
      }

      return {
        valid: true,
        qrId: results[0].id,
        expiresAt: results[0].expires_at,
      };
    } catch (error) {
      logger.error('Error in validateQRToken:', error);
      throw error;
    }
  }

  /**
   * Get QR generation history
   */
  async getQRHistory(classId, sessionId, limit = 20) {
    try {
      const conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const query = `
        SELECT id, qr_token, generated_at, expires_at, scanned_count,
               is_rotated, rotation_index
        FROM qr_generations
        WHERE session_id = ? AND class_id = ?
        ORDER BY generated_at DESC
        LIMIT ?
      `;

      const [results] = await conn.query(query, [sessionId, classId, limit]);
      conn.end();

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getQRHistory:', error);
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
        new_value, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
    `;

    try {
      await conn.query(query, [
        data.user_id,
        data.action,
        data.resource_type,
        data.resource_id,
        data.class_id,
        data.session_id,
        data.new_value ? JSON.stringify(data.new_value) : null,
      ]);
    } catch (error) {
      logger.error('Error logging QR audit:', error);
    }
  }

  /**
   * Generate secure QR token
   */
  generateQRToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for QR validation
   */
  generateSignature(token, sessionId, classId) {
    const { JWT_SECRET_FOR_CRYPTO } = require('../config/jwtSecret');
    const data = `${token}:${sessionId}:${classId}`;
    return crypto.createHmac('sha256', JWT_SECRET_FOR_CRYPTO).update(data).digest('hex');
  }
}

module.exports = new QRGenerationService();
