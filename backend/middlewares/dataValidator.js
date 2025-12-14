/**
 * Complete Data Validation Middleware
 * Ensures NO invalid data reaches database
 * Provides structured error messages with specific codes
 */

const logger = require('../utils/logger');

class DataValidator {
  /**
   * Validate attendance scan request
   */
  static validateAttendanceScan(req, res, next) {
    try {
      const { token, classSessionId, latitude, longitude } = req.body;

      const errors = [];

      // Token validation
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        errors.push({
          field: 'token',
          code: 'INVALID_TOKEN',
          message: 'QR token is required and must be valid'
        });
      }

      // Class session ID validation
      if (!classSessionId || !Number.isInteger(parseInt(classSessionId))) {
        errors.push({
          field: 'classSessionId',
          code: 'INVALID_SESSION_ID',
          message: 'Valid class session ID is required'
        });
      }

      // Location validation (optional but if provided, must be valid)
      if (latitude !== undefined && latitude !== null) {
        const lat = parseFloat(latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push({
            field: 'latitude',
            code: 'INVALID_LATITUDE',
            message: 'Latitude must be between -90 and 90'
          });
        }
      }

      if (longitude !== undefined && longitude !== null) {
        const lon = parseFloat(longitude);
        if (isNaN(lon) || lon < -180 || lon > 180) {
          errors.push({
            field: 'longitude',
            code: 'INVALID_LONGITUDE',
            message: 'Longitude must be between -180 and 180'
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors
        });
      }

      next();
    } catch (error) {
      logger.error('Validation error:', error);
      res.status(500).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error'
      });
    }
  }

  /**
   * Validate admin message request
   */
  static validateAdminMessage(req, res, next) {
    try {
      const { message, messageType, priority } = req.body;

      const errors = [];

      // Message validation
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        errors.push({
          field: 'message',
          code: 'EMPTY_MESSAGE',
          message: 'Message content is required'
        });
      }

      if (message && message.length > 1000) {
        errors.push({
          field: 'message',
          code: 'MESSAGE_TOO_LONG',
          message: 'Message must not exceed 1000 characters'
        });
      }

      // Message type validation
      const validMessageTypes = ['info', 'warning', 'announcement', 'urgent'];
      if (messageType && !validMessageTypes.includes(messageType)) {
        errors.push({
          field: 'messageType',
          code: 'INVALID_MESSAGE_TYPE',
          message: `Message type must be one of: ${validMessageTypes.join(', ')}`
        });
      }

      // Priority validation
      const validPriorities = ['low', 'normal', 'high', 'critical'];
      if (priority && !validPriorities.includes(priority)) {
        errors.push({
          field: 'priority',
          code: 'INVALID_PRIORITY',
          message: `Priority must be one of: ${validPriorities.join(', ')}`
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Message validation failed',
          errors
        });
      }

      next();
    } catch (error) {
      logger.error('Message validation error:', error);
      res.status(500).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error'
      });
    }
  }

  /**
   * Validate login request
   */
  static validateLogin(req, res, next) {
    try {
      const { email, password } = req.body;

      const errors = [];

      // Email validation
      if (!email || typeof email !== 'string') {
        errors.push({
          field: 'email',
          code: 'INVALID_EMAIL',
          message: 'Valid email is required'
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          field: 'email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Email format is invalid'
        });
      }

      // Password validation
      if (!password || typeof password !== 'string' || password.length === 0) {
        errors.push({
          field: 'password',
          code: 'INVALID_PASSWORD',
          message: 'Password is required'
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Login validation failed',
          errors
        });
      }

      next();
    } catch (error) {
      logger.error('Login validation error:', error);
      res.status(500).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error'
      });
    }
  }

  /**
   * Validate registration request
   */
  static validateRegistration(req, res, next) {
    try {
      const { email, password, confirmPassword, name, role } = req.body;

      const errors = [];

      // Email validation
      if (!email || typeof email !== 'string') {
        errors.push({
          field: 'email',
          code: 'INVALID_EMAIL',
          message: 'Valid email is required'
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          field: 'email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Email format is invalid'
        });
      }

      // Password validation
      if (!password || password.length < 8) {
        errors.push({
          field: 'password',
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters'
        });
      } else if (!/[A-Z]/.test(password)) {
        errors.push({
          field: 'password',
          code: 'WEAK_PASSWORD',
          message: 'Password must contain uppercase letter'
        });
      } else if (!/[0-9]/.test(password)) {
        errors.push({
          field: 'password',
          code: 'WEAK_PASSWORD',
          message: 'Password must contain number'
        });
      }

      // Confirm password validation
      if (password !== confirmPassword) {
        errors.push({
          field: 'confirmPassword',
          code: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match'
        });
      }

      // Name validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push({
          field: 'name',
          code: 'INVALID_NAME',
          message: 'Name is required'
        });
      }

      // Role validation
      const validRoles = ['student', 'lecturer', 'admin'];
      if (!role || !validRoles.includes(role)) {
        errors.push({
          field: 'role',
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Registration validation failed',
          errors
        });
      }

      next();
    } catch (error) {
      logger.error('Registration validation error:', error);
      res.status(500).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error'
      });
    }
  }

  /**
   * Generic validation wrapper
   */
  static validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body);

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          code: detail.type,
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors
        });
      }

      req.validatedData = value;
      next();
    };
  }

  /**
   * Sanitize user input (remove dangerous characters)
   */
  static sanitizeInput(req, res, next) {
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj.trim().replace(/[<>\"']/g, '');
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).reduce((acc, key) => {
          acc[key] = sanitize(obj[key]);
          return acc;
        }, Array.isArray(obj) ? [] : {});
      }
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
  }

  /**
   * Check for SQL injection attempts
   */
  static preventSQLInjection(req, res, next) {
    const checkForInjection = (str) => {
      if (typeof str !== 'string') return false;
      const sqlPatterns = /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|SCRIPT)\b)/i;
      return sqlPatterns.test(str);
    };

    const checkObject = (obj) => {
      if (typeof obj === 'string' && checkForInjection(obj)) {
        return true;
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(val => checkObject(val));
      }
      return false;
    };

    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
      logger.warn('Potential SQL injection attempt', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        body: req.body,
        query: req.query
      });

      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid input detected'
      });
    }

    next();
  }
}

module.exports = DataValidator;
