// Use enhanced authServiceV2 with proper error handling
const authServiceV2 = require('../services/authServiceV2');
const logger = require('../utils/logger');

/**
 * Get client IP for login tracking
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.connection.remoteAddress ||
         req.ip ||
         '0.0.0.0';
}

exports.login = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    const result = await authServiceV2.login(req.validatedData || req.body, clientIP);
    
    if (!result.success) {
      return res.status(result.status || 401).json(result);
    }
    
    res.json(result);
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({
      success: false,
      code: 'LOGIN_ERROR',
      message: 'Login failed. Please try again.',
      status: 500
    });
  }
};

exports.register = async (req, res, next) => {
  try {
    const result = await authServiceV2.register(req.validatedData || req.body);
    
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    
    res.status(201).json(result);
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({
      success: false,
      code: 'REGISTRATION_ERROR',
      message: 'Registration failed. Please try again.',
      status: 500
    });
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.user?.id;
    
    if (userId && token) {
      await authServiceV2.logout(userId, token);
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (err) {
    logger.error('Logout error:', err);
    // Don't fail logout even if there's an error
    res.json({ success: true, message: 'Logout successful' });
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'No token provided',
        status: 401
      });
    }
    
    const user = await authServiceV2.verifyToken(token);
    res.json({
      success: true,
      user
    });
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        message: err.message,
        status: err.status
      });
    }
    
    logger.error('Token verification error:', err);
    res.status(401).json({
      success: false,
      code: 'TOKEN_VERIFICATION_ERROR',
      message: 'Token verification failed',
      status: 401
    });
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    // This should only be accessible to admins
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only admins can access this endpoint',
        status: 403
      });
    }
    
    const db = require('../database');
    const [users] = await db.execute(
      'SELECT id, name, email, role, avatar, department, created_at FROM users'
    );
    
    res.json({
      success: true,
      users
    });
  } catch (err) {
    logger.error('Get users error:', err);
    res.status(500).json({
      success: false,
      code: 'FETCH_USERS_ERROR',
      message: 'Failed to fetch users',
      status: 500
    });
  }
};
