const pool = require('../config/database');

/**
 * User Service
 * Handles user registration, authentication, and profile management
 */

class UserService {
  /**
   * Create a new user (registration)
   */
  static async createUser(email, passwordHash, firstName, lastName, role, studentId = null) {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, student_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, student_id, created_at
    `;
    const result = await pool.query(query, [email, passwordHash, firstName, lastName, role, studentId]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = 'SELECT id, email, first_name, last_name, role, student_id, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all users with optional role filter
   */
  static async getAllUsers(role = null, limit = 50, offset = 0) {
    let query = 'SELECT id, email, first_name, last_name, role, student_id, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Update user profile
   */
  static async updateUser(id, firstName, lastName) {
    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, role, updated_at
    `;
    const result = await pool.query(query, [firstName, lastName, id]);
    return result.rows[0];
  }
}

module.exports = UserService;
