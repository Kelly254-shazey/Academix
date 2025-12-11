const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  logger.error(`[${new Date().toISOString()}] ${status} - ${message}`, { url: req.originalUrl, method: req.method });
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
};

exports.notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};
