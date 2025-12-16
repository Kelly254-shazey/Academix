/**
 * Enhanced Authentication Service v2
 * Provides secure login/registration with proper error handling, logging, and audit trails
 */

const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

const { JWT_SECRET_FOR_JWT: JWT_SECRET } = require('../config/jwtSecret');

/**
 * Error codes for client-side handling
 */
const AuthErrors = {
  EMPTY_EMAIL: { code: 'EMPTY_EMAIL', message: 'Email is required', status: 400 },
  EMPTY_PASSWORD: { code: 'EMPTY_PASSWORD', message: 'Password is required', status: 400 },
  INVALID_EMAIL_FORMAT: { code: 'INVALID_EMAIL_FORMAT', message: 'Invalid email format', status: 400 },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: 'No account found with this email', status: 404 },
  INVALID_PASSWORD: { code: 'INVALID_PASSWORD', message: 'Password is incorrect', status: 401 },
  ACCOUNT_LOCKED: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked due to too many failed attempts', status: 429 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later', status: 429 },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', status: 401 },
  TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', message: 'Token has expired. Please log in again', status: 401 },
  USER_DELETED: { code: 'USER_DELETED', message: 'User account no longer exists', status: 404 },
  EMAIL_ALREADY_EXISTS: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists', status: 409 },
  INVALID_ROLE: { code: 'INVALID_ROLE', message: 'Invalid user role specified', status: 400 },
  REGISTRATION_FAILED: { code: 'REGISTRATION_FAILED', message: 'Registration failed. Please try again', status: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'An internal error occurred. Please try again', status: 500 }
};

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get client IP from request (for login attempt tracking)
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.connection.remoteAddress ||
         req.ip ||
         '0.0.0.0';
}

/**
 * Check if account is rate-limited (too many failed attempts)
 */
async function checkRateLimit(email) {
  try {
    const [attempts] = await db.execute(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE email = ? AND status = 'failed' AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [email.toLowerCase()]
    );

    const failedCount = attempts[0].count;
    if (failedCount >= 5) {
      return { limited: true, remainingAttempts: 0 };
    }
    return { limited: false, remainingAttempts: 5 - failedCount };
  } catch (error) {
    logger.error('Error checking rate limit:', error);
    return { limited: false, remainingAttempts: 5 };
  }
}

/**
 * Record login attempt
 */
async function recordLoginAttempt(email, status, ipAddress) {
  try {
    await db.execute(
      `INSERT INTO login_attempts (email, status, ip_address, created_at)
       VALUES (?, ?, ?, NOW())`,
      [email.toLowerCase(), status, ipAddress]
    );

    // Cleanup old attempts (older than 30 days)
    await db.execute(
      `DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
  } catch (error) {
    logger.error('Error recording login attempt:', error);
  }
}

/**
 * Enhanced Login with proper error handling and logging
 */
exports.login = async (data, clientIP) => {
  const { email, password } = data;

  try {
    // Validate input
    if (!email || email.trim().length === 0) {
      throw AuthErrors.EMPTY_EMAIL;
    }
    if (!password || password.length === 0) {
      throw AuthErrors.EMPTY_PASSWORD;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      throw AuthErrors.INVALID_EMAIL_FORMAT;
    }

    // Check rate limiting
    const rateCheck = await checkRateLimit(normalizedEmail);
    if (rateCheck.limited) {
      await recordLoginAttempt(normalizedEmail, 'failed-rate-limited', clientIP);
      throw AuthErrors.ACCOUNT_LOCKED;
    }

    // Find user
    const [rows] = await db.execute(
      `SELECT id, name, email, password_hash, role, avatar, department, student_id FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      // Record failed attempt
      await recordLoginAttempt(normalizedEmail, 'failed-user-not-found', clientIP);
      logger.warn('Login attempt for non-existent user', { email: normalizedEmail, ip: clientIP });
      throw AuthErrors.USER_NOT_FOUND;
    }

    const user = rows[0];

    // Verify password (async)
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      logger.error('Error comparing password:', error);
      throw AuthErrors.INTERNAL_ERROR;
    }

    if (!isPasswordValid) {
      // Record failed attempt
      await recordLoginAttempt(normalizedEmail, 'failed-invalid-password', clientIP);
      logger.warn('Failed login attempt - invalid password', { email: normalizedEmail, ip: clientIP });
      
      const rateCheckAfter = await checkRateLimit(normalizedEmail);
      throw {
        ...AuthErrors.INVALID_PASSWORD,
        remainingAttempts: rateCheckAfter.remainingAttempts
      };
    }

    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (error) {
      logger.error('Error generating JWT:', error);
      throw AuthErrors.INTERNAL_ERROR;
    }

    // Record successful login
    await recordLoginAttempt(normalizedEmail, 'success', clientIP);

    // Update last login timestamp
    // NOTE: last_login column doesn't exist yet, skipping for now
    // try {
    //   await db.execute(
    //     `UPDATE users SET last_login = NOW() WHERE id = ?`,
    //     [user.id]
    //   );
    // } catch (error) {
    //   logger.error('Error updating last login:', error);
    // }

    logger.info('Successful login', {
      userId: user.id,
      email: normalizedEmail,
      role: user.role,
      ip: clientIP
    });

    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      success: true,
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    // Ensure error has proper structure
    if (error.code && error.status) {
      return { success: false, ...error };
    }
    logger.error('Login service error:', error);
    throw AuthErrors.INTERNAL_ERROR;
  }
};

/**
 * Enhanced Register with proper validation
 */
exports.register = async (data) => {
  const { email, password, confirmPassword, name, role, department, studentId } = data;

  try {
    // Validate input
    if (!email || email.trim().length === 0) {
      throw AuthErrors.EMPTY_EMAIL;
    }
    if (!password || password.length === 0) {
      throw AuthErrors.EMPTY_PASSWORD;
    }
    if (!name || name.trim().length === 0) {
      throw { code: 'EMPTY_NAME', message: 'Name is required', status: 400 };
    }
    if (!role) {
      throw { code: 'EMPTY_ROLE', message: 'Role is required', status: 400 };
    }

    // Validate role
    if (!['student', 'lecturer', 'admin'].includes(role)) {
      throw AuthErrors.INVALID_ROLE;
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      throw AuthErrors.INVALID_EMAIL_FORMAT;
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      throw { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long', status: 400 };
    }

    // Check if password and confirmPassword match
    if (confirmPassword && password !== confirmPassword) {
      throw { code: 'PASSWORD_MISMATCH', message: 'Passwords do not match', status: 400 };
    }

    // Check if email already exists
    const [existingUser] = await db.execute(
      `SELECT id FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (existingUser.length > 0) {
      logger.warn('Registration attempt with existing email', { email: normalizedEmail });
      throw AuthErrors.EMAIL_ALREADY_EXISTS;
    }

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw AuthErrors.INTERNAL_ERROR;
    }

    // Insert user
    try {
      let insertQuery = 'INSERT INTO users (name, email, password_hash, role';
      let values = [name.trim(), normalizedEmail, hashedPassword, role];

      if (department) {
        insertQuery += ', department';
        values.push(department.trim());
      }

      if (role === 'student' && studentId) {
        insertQuery += ', student_id';
        values.push(studentId.trim());
      }

      insertQuery += ', created_at) VALUES (?, ?, ?, ?';
      if (department) insertQuery += ', ?';
      if (role === 'student' && studentId) insertQuery += ', ?';
      insertQuery += ', NOW())';

      await db.execute(insertQuery, values);
    } catch (error) {
      logger.error('Error inserting user:', error);
      throw AuthErrors.REGISTRATION_FAILED;
    }

    // Retrieve created user
    const [newUserRows] = await db.execute(
      `SELECT id, name, email, role, department, student_id, created_at FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (newUserRows.length === 0) {
      throw AuthErrors.REGISTRATION_FAILED;
    }

    const newUser = newUserRows[0];

    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (error) {
      logger.error('Error generating JWT:', error);
      throw AuthErrors.INTERNAL_ERROR;
    }

    logger.info('User registered successfully', {
      userId: newUser.id,
      email: normalizedEmail,
      role
    });

    return {
      success: true,
      token,
      user: newUser
    };
  } catch (error) {
    if (error.code && error.status) {
      return { success: false, ...error };
    }
    logger.error('Registration service error:', error);
    throw AuthErrors.INTERNAL_ERROR;
  }
};

/**
 * Verify JWT Token with real-time user data
 */
exports.verifyToken = async (token) => {
  try {
    if (!token) {
      throw AuthErrors.INVALID_TOKEN;
    }

    // Verify and decode JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Token verification failed - token expired');
        throw AuthErrors.TOKEN_EXPIRED;
      }
      logger.warn('Token verification failed', { error: error.message });
      throw AuthErrors.INVALID_TOKEN;
    }

    // Get current user data from database (real-time)
    const [rows] = await db.execute(
      `SELECT id, name, email, role, avatar, department, student_id, status FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      logger.warn('Token verification failed - user not found', { userId: decoded.id });
      throw AuthErrors.USER_DELETED;
    }

    const user = rows[0];

    // Check if user account is still active
    if (user.status && user.status !== 'active') {
      throw { code: 'ACCOUNT_INACTIVE', message: 'This account is inactive', status: 403 };
    }

    return user;
  } catch (error) {
    if (error.code && error.status) {
      throw error;
    }
    logger.error('Token verification error:', error);
    throw AuthErrors.INVALID_TOKEN;
  }
};

/**
 * Get user by ID (real-time)
 */
exports.getUserById = async (userId) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, role, avatar, department, student_id, created_at FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      throw AuthErrors.USER_NOT_FOUND;
    }

    return rows[0];
  } catch (error) {
    if (error.code && error.status) {
      throw error;
    }
    logger.error('Error fetching user:', error);
    throw AuthErrors.INTERNAL_ERROR;
  }
};

/**
 * Logout (invalidate session)
 */
exports.logout = async (userId, token) => {
  try {
    // Store token in blacklist (if implemented)
    await db.execute(
      `INSERT INTO token_blacklist (user_id, token, created_at) VALUES (?, ?, NOW())`,
      [userId, token]
    );

    logger.info('User logged out', { userId });
    return { success: true };
  } catch (error) {
    logger.error('Error during logout:', error);
    // Don't throw - logout should always succeed
    return { success: true };
  }
};

/**
 * Change password
 */
exports.changePassword = async (userId, currentPassword, newPassword) => {
  try {
    if (!currentPassword || !newPassword) {
      throw { code: 'EMPTY_PASSWORD', message: 'Current and new passwords are required', status: 400 };
    }

    // Get user
    const [users] = await db.execute(
      `SELECT id, password_hash FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      throw AuthErrors.USER_NOT_FOUND;
    }

    const user = users[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw { code: 'CURRENT_PASSWORD_INVALID', message: 'Current password is incorrect', status: 401 };
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters long', status: 400 };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.execute(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [hashedPassword, userId]
    );

    logger.info('Password changed successfully', { userId });
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    if (error.code && error.status) {
      throw error;
    }
    logger.error('Error changing password:', error);
    throw AuthErrors.INTERNAL_ERROR;
  }
};

module.exports = exports;
