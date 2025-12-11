/**
 * GPS Validation Utility
 * Validates student location for geofencing
 */

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Validate student GPS location against classroom location
 * @param {number} studentLat - Student latitude
 * @param {number} studentLng - Student longitude
 * @param {number} classroomLat - Classroom latitude
 * @param {number} classroomLng - Classroom longitude
 * @param {number} geofenceRadius - Geofence radius in meters (default: 100m)
 * @returns {Object} Validation result
 */
function validateGeofence(studentLat, studentLng, classroomLat, classroomLng, geofenceRadius = 100) {
  try {
    const distance = calculateDistance(
      studentLat,
      studentLng,
      classroomLat,
      classroomLng,
    );

    return {
      valid: distance <= geofenceRadius,
      distance: Math.round(distance),
      maxDistance: geofenceRadius,
      message: distance <= geofenceRadius
        ? `Student is ${Math.round(distance)}m from classroom (within ${geofenceRadius}m)`
        : `Student is ${Math.round(distance)}m from classroom (exceeds ${geofenceRadius}m limit)`,
    };
  } catch (err) {
    console.error('GPS validation error:', err);
    return {
      valid: false,
      error: 'GPS validation failed',
    };
  }
}

module.exports = {
  calculateDistance,
  validateGeofence,
};
