/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { generateFingerprint } = require('../utils/fingerprinting');

class AuthController {
  /**
   * Register new user
   */
  static async register(req, res) {
    try {
      const { name, email, password, role, department_id } = req.body;

      // Validate input
      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      // Check if user exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      const now = new Date();

      // Create user
      const result = await db.query(
        `INSERT INTO users 
         (id, name, email, password_hash, role, department_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, role`,
        [userId, name, email, passwordHash, role, department_id, now],
      );

      // Generate token
      const token = jwt.sign(
        {
          userId: result.rows[0].id,
          email: result.rows[0].email,
          role: result.rows[0].role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );

      res.status(201).json({
        success: true,
        user: result.rows[0],
        token,
        message: 'User registered successfully',
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password, browserData } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password required',
        });
      }

      // Find user
      const result = await db.query(
        `SELECT id, name, email, password_hash, role FROM users WHERE email = $1`,
        [email],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const user = result.rows[0];

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate fingerprint and store
      const fingerprint = generateFingerprint(browserData);
      await db.query(
        `UPDATE users SET browser_fingerprint = $1, last_login = NOW()
         WHERE id = $2`,
        [fingerprint, user.id],
      );

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          fingerprint,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
        fingerprint,
        message: 'Login successful',
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;

      const result = await db.query(
        `SELECT id, name, email, role, browser_fingerprint, created_at, last_login
         FROM users WHERE id = $1`,
        [userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        user: result.rows[0],
      });
    } catch (err) {
      console.error('Get current user error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      // In stateless JWT, logout is handled on client side
      // But we can invalidate tokens in a blacklist if needed
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { name, phone_number } = req.body;

      const result = await db.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             phone_number = COALESCE($2, phone_number)
         WHERE id = $3
         RETURNING id, name, email, role, phone_number`,
        [name || null, phone_number || null, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        user: result.rows[0],
        message: 'Profile updated',
      });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({
        success: false,
        error: 'Update failed',
      });
    }
  }
}

module.exports = AuthController;
