const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication error: No token provided or invalid format.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user information to the request object for use in subsequent routes
    // We are not fetching from DB here for performance, assuming token is trusted source of user ID and role.
    // For higher security, you could add a DB check to ensure the user still exists and is active.
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    return res.status(401).json({ success: false, message: 'Authentication error: Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
