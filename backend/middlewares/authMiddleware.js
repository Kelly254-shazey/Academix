const jwt = require('jsonwebtoken');
const db = require('../database');
const logger = require('../utils/logger');

// Enhanced JWT verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const [users] = await db.execute(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      logger.audit('TOKEN_INVALID_USER', decoded.id, 'authentication', {
        reason: 'User not found'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }

    const user = users[0];
    
    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      logger.audit('TOKEN_EXPIRED', user.id, 'authentication');
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    // Log successful authentication
    logger.audit('TOKEN_VERIFIED', user.id, 'authentication');
    
    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.audit('ACCESS_DENIED', req.user.id, 'authorization', {
        requiredRoles: roles,
        userRole: req.user.role,
        resource: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [users] = await db.execute(
        'SELECT id, email, role FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length > 0) {
        req.user = users[0];
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed', { error: error.message });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth
};