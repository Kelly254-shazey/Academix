const db = require('../backend/database');
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node scripts/find_attendance.js <sessionId>');
  process.exit(2);
}

(async () => {
  try {
    const [rows] = await db.query('SELECT id, session_id, student_id, checkin_time AS timestamp, captured_lat AS latitude, captured_lng AS longitude, captured_fingerprint AS browser_fingerprint, verification_status FROM attendance_logs WHERE session_id = ? ORDER BY checkin_time DESC LIMIT 50', [sessionId]);
    if (!rows || rows.length === 0) {
      console.log('NOT_FOUND');
      process.exit(0);
    }
    console.log('FOUND');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(3);
  }
})();