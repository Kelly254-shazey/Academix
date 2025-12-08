const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Generate JWT Token
 * Creates a signed JWT token with user data
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Hash Password
 * Hashes password using bcryptjs for secure storage
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare Password
 * Compares provided password with stored hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Validate Email Format
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Format User Response
 * Returns user data without sensitive information
 */
const formatUserResponse = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  validateEmail,
  formatUserResponse,
};
