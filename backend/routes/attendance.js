const express = require('express');
const attendanceService = require('../services/attendanceService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /attendance/student-checkin
// Sample request: { "session_id": 1, "latitude": 40.7128, "longitude": -74.0060, "browser_fingerprint": "unique_hash" }
// Sample response: { "message": "Check-in successful", "status": "success" }
router.post('/student-checkin', authMiddleware, async (req, res) => {
  try {
    const result = await attendanceService.studentCheckin(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance/lecturer-checkin
// Sample request: { "session_id": 1 }
// Sample response: { "message": "Lecturer checked in", "timestamp": "2023-12-01T09:00:00Z" }
router.post('/lecturer-checkin', authMiddleware, async (req, res) => {
  try {
    const result = await attendanceService.lecturerCheckin(req.user.id, req.body.session_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
