const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRegistration } = require('../middlewares/validation');

// Properly validated endpoints with error handling
router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegistration, authController.register);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);
router.get('/users', authController.getAllUsers);

module.exports = router;
