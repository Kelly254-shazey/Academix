const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Create winston logger with rotation
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'classtrack-backend' },
  transports: [
    // Error log
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true
    }),
    // Combined log
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security: Sanitize log data
const sanitizeLogData = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Export methods with sanitization
exports.error = (message, meta = {}) => {
  logger.error(message, sanitizeLogData(meta));
};

exports.warn = (message, meta = {}) => {
  logger.warn(message, sanitizeLogData(meta));
};

exports.info = (message, meta = {}) => {
  logger.info(message, sanitizeLogData(meta));
};

exports.debug = (message, meta = {}) => {
  logger.debug(message, sanitizeLogData(meta));
};

// Security audit logging
exports.audit = (action, userId, resource, details = {}) => {
  logger.info('AUDIT', {
    action,
    userId,
    resource,
    details: sanitizeLogData(details),
    timestamp: new Date().toISOString(),
    type: 'security_audit'
  });
};

// Performance logging
exports.performance = (operation, duration, meta = {}) => {
  logger.info('PERFORMANCE', {
    operation,
    duration,
    meta: sanitizeLogData(meta),
    timestamp: new Date().toISOString(),
    type: 'performance'
  });
};