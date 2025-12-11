/**
 * Browser Fingerprinting Utility
 * Creates unique device identifiers for attendance verification
 */

const crypto = require('crypto');

/**
 * Generate browser fingerprint from device characteristics
 * @param {Object} deviceInfo - Device information object
 * @param {string} userAgent - Browser user agent
 * @param {string} acceptLanguage - Browser language preference
 * @returns {string} Unique fingerprint hash
 */
function generateFingerprint(deviceInfo = {}, userAgent, acceptLanguage) {
  try {
    const components = [
      userAgent || 'unknown',
      acceptLanguage || 'unknown',
      deviceInfo.platform || 'unknown',
      deviceInfo.hardwareConcurrency || 'unknown',
      deviceInfo.deviceMemory || 'unknown',
      deviceInfo.screen?.width || 'unknown',
      deviceInfo.screen?.height || 'unknown',
      deviceInfo.screen?.colorDepth || 'unknown',
      deviceInfo.timezone || 'unknown',
      deviceInfo.language || 'unknown',
    ].join('|');

    const fingerprint = crypto
      .createHash('sha256')
      .update(components)
      .digest('hex');

    return fingerprint;
  } catch (err) {
    console.error('Fingerprint generation error:', err);
    throw err;
  }
}

/**
 * Validate fingerprint consistency
 * Detects if attendance is being attempted from unauthorized device
 * @param {string} currentFingerprint - Current device fingerprint
 * @param {string} storedFingerprint - Previously stored fingerprint
 * @returns {Object} Validation result
 */
function validateFingerprint(currentFingerprint, storedFingerprint) {
  if (!currentFingerprint || !storedFingerprint) {
    return {
      valid: true,
      match: false,
      message: 'No previous fingerprint to compare',
    };
  }

  const matches = currentFingerprint === storedFingerprint;

  return {
    valid: matches,
    match: matches,
    message: matches
      ? 'Device fingerprint matches'
      : 'Device fingerprint mismatch - possible unauthorized access',
  };
}

/**
 * Detect suspicious fingerprint patterns
 * Multiple students using same fingerprint = possible spoofing
 * @param {string} fingerprint - Device fingerprint
 * @param {array} recentAttendances - Recent attendance logs
 * @returns {Object} Anomaly detection result
 */
function detectAnomalies(fingerprint, recentAttendances = []) {
  try {
    // Count how many different students used this fingerprint recently
    const uniqueStudents = new Set(
      recentAttendances
        .filter((log) => log.browser_fingerprint === fingerprint)
        .map((log) => log.student_id),
    );

    const suspiciousCount = uniqueStudents.size;
    const isSuspicious = suspiciousCount > 1;

    return {
      suspicious: isSuspicious,
      studentCount: suspiciousCount,
      severity: isSuspicious ? 'high' : 'low',
      message: isSuspicious
        ? `Fingerprint used by ${suspiciousCount} different students - likely spoofing`
        : 'No anomalies detected',
    };
  } catch (err) {
    console.error('Anomaly detection error:', err);
    return {
      suspicious: false,
      error: 'Anomaly detection failed',
    };
  }
}

module.exports = {
  generateFingerprint,
  validateFingerprint,
  detectAnomalies,
};
