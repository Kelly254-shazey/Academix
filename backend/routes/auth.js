const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validation');
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(1).required().messages({
    'string.min': 'Password must be at least 1 character',
    'any.required': 'Password is required'
  })
});

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Name is required',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  }),
  role: Joi.string().valid('student', 'lecturer', 'admin').required().messages({
    'any.only': 'Role must be one of: student, lecturer, admin',
    'any.required': 'Role is required'
  }),
  department: Joi.string().min(0).max(255).optional(),
  studentId: Joi.string().min(1).max(50).optional()
});

// Properly validated endpoints with error handling
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);
router.get('/users', authController.getAllUsers);

module.exports = router;
