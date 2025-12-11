const express = require('express');
const router = express.Router();
const db = require('../database'); // promise-based pool

// GET /classes - list classes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, course_code, course_name, lecturer_id, day_of_week, start_time, end_time FROM classes');
    res.json({ message: 'Classes fetched', classes: rows });
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// POST /classes - create a class
router.post('/', async (req, res) => {
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng } = req.body;
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let dayValue = day_of_week;
  if (typeof day_of_week === 'number') {
    dayValue = dayNames[day_of_week] || dayNames[0];
  }
  if (!dayValue) dayValue = dayNames[0];
  try {
    const [result] = await db.query(
      'INSERT INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [course_code, course_name, lecturer_id || null, dayValue, start_time, end_time, (location_lat != null ? location_lat : 0.0), (location_lng != null ? location_lng : 0.0)]
    );
    res.status(201).json({ message: 'Class created', classId: result.insertId });
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// GET /classes/:id - get class by id
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM classes WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: rows[0] });
  } catch (err) {
    console.error('Error fetching class:', err);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// PUT /classes/:id - update class
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng } = req.body;
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let dayValue = day_of_week;
  if (typeof day_of_week === 'number') {
    dayValue = dayNames[day_of_week] || dayNames[0];
  }
  if (!dayValue) dayValue = dayNames[0];
  try {
    const [result] = await db.query(
      'UPDATE classes SET course_code = ?, course_name = ?, lecturer_id = ?, day_of_week = ?, start_time = ?, end_time = ?, location_lat = ?, location_lng = ? WHERE id = ?',
      [course_code, course_name, lecturer_id || null, dayValue, start_time, end_time, (location_lat != null ? location_lat : 0.0), (location_lng != null ? location_lng : 0.0), id]
    );
    res.json({ message: 'Class updated', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// POST /classes/:classId/sessions - create a class session
router.post('/:classId/sessions', async (req, res) => {
  const classId = req.params.classId;
  const { session_date, qr_signature } = req.body;
  try {
    // DB uses column `qr_base_signature` for stored QR signature
    const [result] = await db.query(
      'INSERT INTO class_sessions (class_id, session_date, qr_base_signature) VALUES (?, ?, ?)',
      [classId, session_date, qr_signature || null]
    );
    res.status(201).json({ message: 'Session created', sessionId: result.insertId });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// POST /classes/:classId/sessions/:sessionId/scan
// Expects JSON: { studentId, qr_signature, latitude, longitude, browser_fingerprint }
router.post('/:classId/sessions/:sessionId/scan', async (req, res) => {
  const { classId, sessionId } = req.params;
  const { studentId, qr_signature, latitude, longitude, browser_fingerprint } = req.body;

  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    // Fetch session to validate QR signature (DB stores as `qr_base_signature`)
    const [sessions] = await db.query('SELECT id, qr_base_signature FROM class_sessions WHERE id = ? AND class_id = ?', [sessionId, classId]);
    if (sessions.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessions[0];
    // If QR signature exists on session, validate against stored `qr_base_signature`
    if (session.qr_base_signature) {
      if (!qr_signature || qr_signature !== session.qr_base_signature) {
        return res.status(400).json({ error: 'Invalid QR signature', verification_status: 'expired' });
      }
    }

    // Insert attendance log - DB uses captured_* column names and checkin_time
    const [insertRes] = await db.query(
      'INSERT INTO attendance_logs (session_id, student_id, captured_lat, captured_lng, captured_fingerprint, verification_status) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, studentId, latitude || null, longitude || null, browser_fingerprint || null, 'success']
    );

    res.status(201).json({ message: 'Scan recorded', attendanceId: insertRes.insertId });
  } catch (err) {
    console.error('Error handling scan:', err);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

module.exports = router;
