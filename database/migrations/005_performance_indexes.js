/**
 * Migration: Add Performance Indexes
 * Purpose: Optimize queries for attendance scans, admin messages, and session queries
 * Date: 2024
 */

const mysql = require('mysql');

const indexes = [
  {
    table: 'attendance_scans',
    name: 'idx_student_session',
    columns: '(student_id, class_session_id)'
  },
  {
    table: 'admin_messages',
    name: 'idx_recipient',
    columns: '(recipient_id, recipient_type)'
  },
  {
    table: 'class_sessions',
    name: 'idx_status',
    columns: '(status, lecturer_id)'
  }
];

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'class_ai_db'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  console.log('📊 Running: Add Performance Indexes');
  console.log('=' .repeat(60));

  let completed = 0;

  indexes.forEach((idx, i) => {
    const sql = `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}${idx.columns}`;
    
    connection.query(sql, (err, results) => {
      if (err) {
        console.error(`❌ Index ${i + 1} (${idx.name}):`, err.message);
      } else {
        console.log(`✓ Index ${i + 1}: ${idx.name} on ${idx.table}`);
      }
      
      completed++;
      if (completed === indexes.length) {
        console.log('=' .repeat(60));
        console.log('✓ Migration complete: All performance indexes created');
        connection.end();
      }
    });
  });
});
