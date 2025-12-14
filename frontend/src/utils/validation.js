/**
 * Validation Helpers
 * Common validation functions for forms
 */

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? null : 'Invalid email format';
};

export const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain number';
  return null;
};

export const validateQRToken = (token) => {
  if (!token || token.length < 10) return 'Invalid QR token';
  return null;
};

export const validateLocation = (latitude, longitude) => {
  if (!latitude || !longitude) return 'Location required';
  if (latitude < -90 || latitude > 90) return 'Invalid latitude';
  if (longitude < -180 || longitude > 180) return 'Invalid longitude';
  return null;
};

export const validateMessage = (message) => {
  if (!message || message.trim().length === 0) return 'Message cannot be empty';
  if (message.length > 5000) return 'Message too long (max 5000 characters)';
  return null;
};

export const validateSearch = (query) => {
  if (query.length > 100) return 'Search query too long';
  return null;
};

export const sanitizeInput = (input) => {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim();
};
