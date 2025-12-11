const db = require('../database');

exports.getAllClasses = async () => {
  const [rows] = await db.query('SELECT id, course_code, course_name, lecturer_id, day_of_week, start_time, end_time FROM classes');
  return rows;
};

exports.createClass = async (data) => {
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng } = data;
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let dayValue = day_of_week;
  if (typeof day_of_week === 'number') {
    dayValue = dayNames[day_of_week] || dayNames[0];
  }
  if (!dayValue) dayValue = dayNames[0];
  const [result] = await db.query(
    'INSERT INTO classes (course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [course_code, course_name, lecturer_id || null, dayValue, start_time, end_time, (location_lat != null ? location_lat : 0.0), (location_lng != null ? location_lng : 0.0)]
  );
  return result.insertId;
};

exports.getClassById = async (id) => {
  const [rows] = await db.query('SELECT * FROM classes WHERE id = ?', [id]);
  return rows[0];
};

exports.updateClass = async (id, data) => {
  const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time, location_lat, location_lng } = data;
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let dayValue = day_of_week;
  if (typeof day_of_week === 'number') {
    dayValue = dayNames[day_of_week] || dayNames[0];
  }
  if (!dayValue) dayValue = dayNames[0];
  const [result] = await db.query(
    'UPDATE classes SET course_code = ?, course_name = ?, lecturer_id = ?, day_of_week = ?, start_time = ?, end_time = ?, location_lat = ?, location_lng = ? WHERE id = ?',
    [course_code, course_name, lecturer_id || null, dayValue, start_time, end_time, (location_lat != null ? location_lat : 0.0), (location_lng != null ? location_lng : 0.0), id]
  );
  return result.affectedRows;
};

exports.deleteClass = async (id) => {
  const [result] = await db.query('DELETE FROM classes WHERE id = ?', [id]);
  return result.affectedRows;
};

exports.createSession = async (classId, data) => {
  const { session_date, qr_signature } = data;
  const [result] = await db.query(
    'INSERT INTO class_sessions (class_id, session_date, qr_signature_hash) VALUES (?, ?, ?)',
    [classId, session_date, qr_signature || null]
  );
  return result.insertId;
};

exports.scanSession = async (classId, sessionId, data) => {
  const { studentId, qr_signature, latitude, longitude, browser_fingerprint } = data;
  // Fetch session to validate QR signature
  const [sessions] = await db.query('SELECT id, qr_signature_hash FROM class_sessions WHERE id = ? AND class_id = ?', [sessionId, classId]);
  if (sessions.length === 0) throw new Error('Session not found');
  const session = sessions[0];
  if (session.qr_signature_hash) {
    if (!qr_signature || qr_signature !== session.qr_signature_hash) {
      const err = new Error('Invalid QR signature');
      err.status = 400;
      throw err;
    }
  }
  const [insertRes] = await db.query(
    'INSERT INTO attendance_logs (session_id, student_id, captured_lat, captured_lng, captured_fingerprint, verification_status) VALUES (?, ?, ?, ?, ?, ?)',
    [sessionId, studentId, latitude || null, longitude || null, browser_fingerprint || null, 'success']
  );
  return insertRes.insertId;
};
