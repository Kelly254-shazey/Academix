const { body, param, query, validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/responseHelper');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    return sendValidationError(res, 'Validation failed', formattedErrors);
  }
  next();
};

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
    
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  role: body('role')
    .isIn(['student', 'lecturer', 'admin', 'hod', 'superadmin'])
    .withMessage('Invalid role'),
    
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
    
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
};

// Specific validation chains
const validateRegistration = [
  commonValidations.email,
  commonValidations.password,
  commonValidations.name,
  commonValidations.role,
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name too long'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Student ID too long'),
  body('employeeId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Employee ID too long'),
  handleValidationErrors
];

const validateLogin = [
  commonValidations.email,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  commonValidations.email,
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  commonValidations.password.withMessage('New password must meet requirements'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
];

const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name too long'),
  handleValidationErrors
];

const validateAttendance = [
  body('sessionId')
    .isInt({ min: 1 })
    .withMessage('Valid session ID is required'),
  body('qrToken')
    .notEmpty()
    .withMessage('QR token is required'),
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  handleValidationErrors
];

const validateClassCreation = [
  body('courseName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Course name must be between 2 and 200 characters'),
  body('courseCode')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Course code must be between 2 and 20 characters'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('schedule')
    .isArray()
    .withMessage('Schedule must be an array'),
  handleValidationErrors
];

const validateSessionCreation = [
  body('classId')
    .isInt({ min: 1 })
    .withMessage('Valid class ID is required'),
  body('sessionType')
    .isIn(['lecture', 'tutorial', 'lab', 'seminar'])
    .withMessage('Invalid session type'),
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  handleValidationErrors
];

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential script tags or dangerous content
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validatePasswordChange,
  validateProfileUpdate,
  validateAttendance,
  validateClassCreation,
  validateSessionCreation,
  sanitizeInput,
  commonValidations
};