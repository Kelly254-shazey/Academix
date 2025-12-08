/**
 * QR Code Service
 * Generates, validates, and manages rotating QR codes
 */

const QRCode = require('qrcode');
const crypto = require('crypto');
const redis = require('../config/redis');

class QRService {
  /**
   * Generate rotating QR code for class session
   * @param {string} sessionId - Class session ID
   * @param {number} refreshInterval - QR refresh interval in seconds (30-60)
   */
  static async generateQRCode(sessionId, refreshInterval = 45) {
    try {
      // Create encrypted token with timestamp
      const timestamp = Math.floor(Date.now() / 1000);
      const secret = process.env.QR_SECRET || 'qr-secret-key';
      
      // Signature includes session + timestamp
      const dataToSign = `${sessionId}:${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

      const qrData = `${sessionId}|${timestamp}|${signature}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      // Store in Redis with expiration
      const cacheKey = `qr:${sessionId}`;
      await redis.set(cacheKey, {
        sessionId,
        timestamp,
        signature,
        qrData,
        expiresAt: timestamp + refreshInterval,
      }, refreshInterval);

      return {
        success: true,
        qrCodeDataUrl,
        qrData,
        timestamp,
        expiresAt: timestamp + refreshInterval,
      };
    } catch (err) {
      console.error('QR generation error:', err);
      throw err;
    }
  }

  /**
   * Validate QR code token
   * @param {string} sessionId - Class session ID
   * @param {string} qrData - QR data from student scan
   */
  static async validateQRCode(sessionId, qrData) {
    try {
      // Parse QR data
      const [scannedSessionId, scannedTimestamp, scannedSignature] = qrData.split('|');

      if (scannedSessionId !== sessionId) {
        return {
          valid: false,
          reason: 'Session ID mismatch',
        };
      }

      // Get stored QR from cache
      const cacheKey = `qr:${sessionId}`;
      const storedQR = await redis.get(cacheKey);

      if (!storedQR) {
        return {
          valid: false,
          reason: 'QR code expired or not found',
        };
      }

      // Verify timestamp is not too old (max 2 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - parseInt(scannedTimestamp) > 120) {
        return {
          valid: false,
          reason: 'QR code expired (timestamp too old)',
        };
      }

      // Verify signature
      const secret = process.env.QR_SECRET || 'qr-secret-key';
      const dataToSign = `${sessionId}:${scannedTimestamp}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

      if (scannedSignature !== expectedSignature) {
        return {
          valid: false,
          reason: 'Invalid QR signature (possible tampering)',
        };
      }

      return {
        valid: true,
        sessionId,
        timestamp: parseInt(scannedTimestamp),
      };
    } catch (err) {
      console.error('QR validation error:', err);
      return {
        valid: false,
        reason: 'Validation error',
      };
    }
  }

  /**
   * Get current active QR code
   */
  static async getCurrentQR(sessionId) {
    try {
      const cacheKey = `qr:${sessionId}`;
      const qr = await redis.get(cacheKey);

      if (!qr) {
        return {
          active: false,
          message: 'No active QR code',
        };
      }

      // Generate fresh QR code display
      const qrCodeDataUrl = await QRCode.toDataURL(qr.qrData);

      return {
        active: true,
        qrCodeDataUrl,
        expiresIn: qr.expiresAt - Math.floor(Date.now() / 1000),
      };
    } catch (err) {
      console.error('Get QR error:', err);
      throw err;
    }
  }

  /**
   * Check QR code validity status
   */
  static async checkQRStatus(sessionId) {
    try {
      const cacheKey = `qr:${sessionId}`;
      const exists = await redis.exists(cacheKey);

      if (!exists) {
        return {
          status: 'expired',
          message: 'QR code no longer active',
        };
      }

      const qr = await redis.get(cacheKey);
      const timeRemaining = qr.expiresAt - Math.floor(Date.now() / 1000);

      return {
        status: 'active',
        expiresIn: timeRemaining,
        message: `QR code expires in ${timeRemaining} seconds`,
      };
    } catch (err) {
      console.error('Check QR status error:', err);
      throw err;
    }
  }

  /**
   * Refresh QR code (generate new one)
   */
  static async refreshQRCode(sessionId) {
    try {
      // Delete old QR
      await redis.del(`qr:${sessionId}`);

      // Generate new QR
      return await this.generateQRCode(sessionId);
    } catch (err) {
      console.error('Refresh QR error:', err);
      throw err;
    }
  }
}

module.exports = QRService;
