const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Authentication Routes
 * POST   /auth/register - Register new user
 * POST   /auth/login    - Login user
 * GET    /auth/me       - Get current user (protected)
 * POST   /auth/logout   - Logout user (optional, mainly client-side)
 */

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/logout', authenticateToken, (req, res) => {
  // Logout is primarily handled client-side (token removal)
  // Backend confirms logout was successful
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
