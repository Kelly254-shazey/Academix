const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validation');
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

const registerSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().min(0).required(),
  name: Joi.string().min(0).max(255).required(),
  role: Joi.string().valid('student', 'lecturer', 'admin').required(),
  department: Joi.string().min(0).max(255).optional(),
  studentId: Joi.string().min(1).max(50).when('role', {
    is: 'student',
    then: Joi.optional(),
    otherwise: Joi.optional()
  })
});

router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);
router.get('/users', authController.getAllUsers);
module.exports = router;
