/**
 * Migration: Add Performance Indexes
 * Purpose: Optimize queries for attendance scans, admin messages, and session queries
 * Uses the provided `db` promise pool so migrations runner can execute safely
 */

const indexes = [
  { table: 'attendance_scans', name: 'idx_student_session', columns: '(student_id, class_session_id)' },
  { table: 'admin_messages', name: 'idx_recipient', columns: '(recipient_id, recipient_type)' },
  { table: 'class_sessions', name: 'idx_status', columns: '(status, lecturer_id)' }
];

module.exports.up = async function up(db) {
  try {
    console.log('📊 Running migration: Add Performance Indexes');

    for (const idx of indexes) {
      const sql = `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} ${idx.columns}`;
      try {
        await db.execute(sql);
        console.log(`✓ Created index ${idx.name} on ${idx.table}`);
      } catch (err) {
        console.warn(`⚠️ Skipped/failed creating index ${idx.name} on ${idx.table}:`, err.message || err);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Performance index migration failed:', error.message || error);
    throw error;
  }
};
