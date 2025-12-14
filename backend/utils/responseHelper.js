/**
 * Standardized Response Helper
 * Ensures all API responses follow the format:
 * { success: bool, message: string, data: any, timestamp: ISO8601 }
 */

const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, message = 'Error', statusCode = 500, isDevelopment = false, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Include error details only in development
  if (isDevelopment && error) {
    response.error = error.message || error;
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

const sendValidationError = (res, message = 'Validation failed', errors = []) => {
  return res.status(400).json({
    success: false,
    message,
    data: errors,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError
};
