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
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
      [course_code, course_name, lecturer_id || null, day_of_week, start_time, end_time]
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
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE classes SET course_code = ?, course_name = ?, lecturer_id = ?, day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?',
      [course_code, course_name, lecturer_id || null, day_of_week, start_time, end_time, id]
    );
    res.json({ message: 'Class updated', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// POST /classes/:classId/sessions - create a class session (optionally generate QR signature on frontend/server)
router.post('/:classId/sessions', async (req, res) => {
  const classId = req.params.classId;
  const { session_date, qr_signature, qr_expires_at } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO class_sessions (class_id, session_date, qr_signature, qr_expires_at) VALUES (?, ?, ?, ?)',
      [classId, session_date, qr_signature || null, qr_expires_at || null]
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
    // Fetch session to validate QR signature and expiry
    const [sessions] = await db.query('SELECT id, qr_signature, qr_expires_at FROM class_sessions WHERE id = ? AND class_id = ?', [sessionId, classId]);
    if (sessions.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessions[0];

    // If QR signature exists on session, validate
    if (session.qr_signature) {
      if (!qr_signature || qr_signature !== session.qr_signature) {
        return res.status(400).json({ error: 'Invalid QR signature', verification_status: 'expired' });
      }
    }

    // Check expiry if set
    if (session.qr_expires_at) {
      const now = new Date();
      const expires = new Date(session.qr_expires_at);
      if (now > expires) return res.status(400).json({ error: 'QR expired', verification_status: 'expired' });
    }

    // Insert attendance log
    const [insertRes] = await db.query(
      'INSERT INTO attendance_logs (session_id, student_id, latitude, longitude, browser_fingerprint, verification_status) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, studentId, latitude || null, longitude || null, browser_fingerprint || null, 'success']
    );

    res.status(201).json({ message: 'Scan recorded', attendanceId: insertRes.insertId });
  } catch (err) {
    console.error('Error handling scan:', err);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

module.exports = router;
