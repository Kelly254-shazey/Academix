const UserService = require('../services/UserService');
const { generateToken, hashPassword, comparePassword, validateEmail, formatUserResponse } = require('../utils/auth');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Authentication Controller
 * Handles login, signup, and user authentication
 */

class AuthController {
  /**
   * User Registration
   */
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, role, studentId } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !role) {
        return sendError(res, 'Missing required fields', 400);
      }

      if (!validateEmail(email)) {
        return sendError(res, 'Invalid email format', 400);
      }

      if (password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters', 400);
      }

      // Check if user exists
      const existingUser = await UserService.findByEmail(email);
      if (existingUser) {
        return sendError(res, 'Email already registered', 400);
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await UserService.createUser(email, passwordHash, firstName, lastName, role, studentId);

      const token = generateToken(user);
      return sendSuccess(res, { user: formatUserResponse(user), token }, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password required', 400);
      }

      const user = await UserService.findByEmail(email);
      if (!user) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const validPassword = await comparePassword(password, user.password_hash);
      if (!validPassword) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const token = generateToken(user);
      return sendSuccess(res, { user: formatUserResponse(user), token }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current User
   */
  static async getCurrentUser(req, res, next) {
    try {
      const user = await UserService.findById(req.user.id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, user, 'User retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
