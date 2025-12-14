const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET_FOR_JWT: JWT_SECRET } = require('../config/jwtSecret');

/**
 * Authentication middleware to verify JWT token
 * - Skips CORS preflight (`OPTIONS`)
 * - Accepts case-insensitive `Bearer` scheme
 * - Returns clear 401 messages for missing/invalid/expired tokens
 */
const authMiddleware = (req, res, next) => {
  try {
    // Allow CORS preflight requests to pass through
    if (req.method === 'OPTIONS') return next();

    // Read the Authorization header (handle different casing)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authentication error: No token provided.' });
    }

    // Expect header like: "Bearer <token>" (case-insensitive)
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
      return res.status(401).json({ success: false, message: 'Authentication error: Invalid authorization header format.' });
    }

    const token = parts[1];

    // Verify the token using the configured secret
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach minimal user info to the request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    return next();
  } catch (error) {
    // Log the real error message for debugging
    console.error('Authentication middleware error:', error && error.message ? error.message : error);

    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Authentication error: Token expired.' });
    }

    return res.status(401).json({ success: false, message: 'Authentication error: Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
