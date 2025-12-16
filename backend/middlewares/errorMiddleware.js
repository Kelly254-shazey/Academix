const logger = require('../utils/logger');

// Security headers middleware
exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

// Enhanced error handler with security considerations
exports.errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  
  // Don't expose sensitive error details in production
  let message = 'Internal server error';
  if (status < 500) {
    message = err.message || 'Bad request';
  } else if (process.env.NODE_ENV === 'development') {
    message = err.message || 'Internal server error';
  }
  
  // Log error with context
  logger.error(`${status} - ${err.message || 'Unknown error'}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    stack: err.stack
  });
  
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(status).json(response);
};

// Enhanced 404 handler
exports.notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
};

// Request timeout middleware
exports.requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      const err = new Error('Request timeout');
      err.status = 408;
      next(err);
    });
    next();
  };
};