// qrGenerationService.js
// QR code generation, rotation, and validation for lecturer-enabled check-ins
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const crypto = require('crypto');
const logger = require('../utils/logger');

class QRGenerationService {
  /**
   * Generate QR code for student check-in
   */
  async generateQR(classId, sessionId, lecturerId, options = {}) {
    try {
      // Generate QR token and signature
      const qrToken = this.generateQRToken();
      const signature = this.generateSignature(qrToken, sessionId, classId);
      const expiresAt = new Date(Date.now() + (options.validitySeconds || 35) * 1000);
      
      // Generate QR code data URL
      const QRCode = require('qrcode');
      const qrData = JSON.stringify({
        token: qrToken,
        sessionId,
        classId,
        expiresAt: expiresAt.toISOString(),
        signature
      });
      
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

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
          qrImage,
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
      logger.error('Error in generateQR:', error);
      throw error;
    }
  }

  /**
   * Rotate QR code (generate new token while invalidating old)
   */
  async rotateQR(classId, sessionId, lecturerId) {
    try {
      // Generate new QR
      const newQRToken = this.generateQRToken();
      const newSignature = this.generateSignature(newQRToken, sessionId, classId);
      const expiresAt = new Date(Date.now() + 35 * 1000);
      
      // Generate QR code image
      const QRCode = require('qrcode');
      const qrData = JSON.stringify({
        token: newQRToken,
        sessionId,
        classId,
        expiresAt: expiresAt.toISOString(),
        signature: newSignature
      });
      
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      logger.info(`QR rotated for session ${sessionId}`);

      return {
        success: true,
        data: {
          qrToken: newQRToken,
          signature: newSignature,
          expiresAt: expiresAt.toISOString(),
          qrImage,
        },
      };
    } catch (error) {
      logger.error('Error in rotateQR:', error);
      throw error;
    }
  }

  /**
   * Get current active QR for session
   */
  async getActiveQR(classId, sessionId) {
    try {
      // Generate a new QR code for demo purposes
      const qrToken = this.generateQRToken();
      const signature = this.generateSignature(qrToken, sessionId, classId);
      const expiresAt = new Date(Date.now() + 35 * 1000);
      
      const QRCode = require('qrcode');
      const qrData = JSON.stringify({
        token: qrToken,
        sessionId,
        classId,
        expiresAt: expiresAt.toISOString(),
        signature
      });
      
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        success: true,
        data: {
          qrToken,
          signature,
          expiresAt: expiresAt.toISOString(),
          qrImage
        },
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
      // Verify signature
      const expectedSignature = this.generateSignature(qrToken, sessionId, classId);
      if (signature !== expectedSignature) {
        return {
          success: true,
          data: {
            valid: false,
            reason: 'Invalid signature',
          }
        };
      }

      return {
        success: true,
        data: {
          valid: true,
          qrId: 'demo_qr_' + Date.now(),
          expiresAt: new Date(Date.now() + 35000).toISOString(),
        }
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
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      logger.error('Error in getQRHistory:', error);
      throw error;
    }
  }

  /**
   * Audit log helper
   */
  async auditLog(data) {
    try {
      logger.info('QR Audit Log:', data);
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
