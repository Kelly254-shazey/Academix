const crypto = require('crypto');

// Centralized JWT secret helper
// Reads process.env.JWT_SECRET, trims whitespace, and if it appears to be Base64,
// exposes a Buffer for use with crypto operations. Export both raw and jwt-safe values.

function looksLikeBase64(s) {
  if (!s || typeof s !== 'string') return false;
  // base64 should be length multiple of 4 and only base64 chars
  if (s.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(s);
}

const RAW = process.env.JWT_SECRET;
const TRIMMED = typeof RAW === 'string' ? RAW.trim() : RAW;

let JWT_SECRET_FOR_JWT = TRIMMED || 'your-secret-key-change-in-production';
let JWT_SECRET_FOR_CRYPTO = JWT_SECRET_FOR_JWT;

if (typeof JWT_SECRET_FOR_JWT === 'string' && looksLikeBase64(JWT_SECRET_FOR_JWT)) {
  try {
    const decoded = Buffer.from(JWT_SECRET_FOR_JWT, 'base64');
    // prefer using the decoded bytes for HMAC/crypto usage
    JWT_SECRET_FOR_CRYPTO = decoded;
    // Keep JWT_SECRET_FOR_JWT as the original string (jsonwebtoken accepts string or buffer)
  } catch (e) {
    // leave as-is
  }
}

module.exports = {
  RAW,
  TRIMMED,
  JWT_SECRET_FOR_JWT, // string or buffer acceptable to jwt.sign / jwt.verify
  JWT_SECRET_FOR_CRYPTO,
  fingerprint() {
    return crypto.createHash('sha256').update(String(JWT_SECRET_FOR_JWT)).digest('hex');
  }
};
