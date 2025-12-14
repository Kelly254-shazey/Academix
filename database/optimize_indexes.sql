-- ============================================================================
-- DATABASE OPTIMIZATION: CRITICAL INDEXES
-- Purpose: Fix poor data fetching performance
-- Database: class_ai_db
-- Date: 2025-12-14
-- ============================================================================

-- ============================================================================
-- 1. SINGLE COLUMN INDEXES (Essential for WHERE clauses and JOINs)
-- ============================================================================

-- class_sessions table - frequently joined by class_id and filtered by session_date
ALTER TABLE class_sessions ADD INDEX idx_class_id (class_id);
ALTER TABLE class_sessions ADD INDEX idx_session_date (session_date);

-- attendance_logs table - core table for all attendance queries
ALTER TABLE attendance_logs ADD INDEX idx_student_id (student_id);
ALTER TABLE attendance_logs ADD INDEX idx_session_id (session_id);
ALTER TABLE attendance_logs ADD INDEX idx_checkin_time (checkin_time);

-- classes table - frequently joined by lecturer_id
ALTER TABLE classes ADD INDEX idx_lecturer_id (lecturer_id);
ALTER TABLE classes ADD INDEX idx_day_of_week (day_of_week);

-- notifications table - filtered by user_id and read status
ALTER TABLE notifications ADD INDEX idx_user_id (user_id);
ALTER TABLE notifications ADD INDEX idx_is_read (is_read);

-- admin_messages table - already has some indexes, verify they exist
-- ALTER TABLE admin_messages MODIFY INDEX idx_student_id (student_id); -- Already exists

-- qr_generations table - critical for QR validation
ALTER TABLE qr_generations ADD INDEX idx_qr_token (qr_token);
ALTER TABLE qr_generations ADD INDEX idx_session_id (session_id);
ALTER TABLE qr_generations ADD INDEX idx_expires_at (expires_at);

-- departments table - lookup table
ALTER TABLE departments ADD INDEX idx_code (code);

-- user_settings table
ALTER TABLE user_settings ADD INDEX idx_user_id (user_id);

-- ============================================================================
-- 2. COMPOUND INDEXES (For complex queries with multiple WHERE conditions)
-- ============================================================================

-- Most used: attendance query by student and session
ALTER TABLE attendance_logs ADD INDEX idx_student_session (student_id, session_id);

-- Class sessions filtered by class and date
ALTER TABLE class_sessions ADD INDEX idx_class_date (class_id, session_date);

-- Admin messages sorted by student and date
ALTER TABLE admin_messages ADD INDEX idx_student_created (student_id, created_at DESC);

-- QR generation lookup by token and session
ALTER TABLE qr_generations ADD INDEX idx_token_session (qr_token, session_id);

-- Class sessions filtered by class and active status
ALTER TABLE class_sessions ADD INDEX idx_class_active (class_id, is_active);

-- Class enrollments - if exists
-- ALTER TABLE class_enrollments ADD INDEX idx_class_student (class_id, student_id);

-- ============================================================================
-- 3. VERIFY INDEX CREATION (Run this to check)
-- ============================================================================

-- After running the ALTER statements above, verify with:
-- SHOW INDEX FROM class_sessions;
-- SHOW INDEX FROM attendance_logs;
-- SHOW INDEX FROM classes;
-- SHOW INDEX FROM notifications;
-- SHOW INDEX FROM qr_generations;

-- ============================================================================
-- 4. PERFORMANCE CHECK QUERIES
-- ============================================================================

-- After adding indexes, these queries should be MUCH faster:

-- Check 1: Admin Dashboard Overview (was ~3-5s, should be <500ms)
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
  (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super-admin')) as total_admins,
  (SELECT COUNT(*) FROM departments) as total_departments,
  (SELECT COUNT(*) FROM classes) as total_classes,
  (SELECT COUNT(*) FROM attendance_logs) as total_attendance_records,
  (SELECT COUNT(*) FROM class_sessions WHERE session_date >= CURDATE()) as active_sessions;

-- Check 2: Student Attendance History (was ~1-2s, should be <300ms)
-- Use EXPLAIN to see the query plan
EXPLAIN SELECT al.id, al.checkin_time, cs.session_date, c.course_code
FROM attendance_logs al
JOIN class_sessions cs ON al.session_id = cs.id
JOIN classes c ON cs.class_id = c.id
WHERE al.student_id = 1
ORDER BY cs.session_date DESC;

-- Check 3: Lecturer Classes (was ~1-2s, should be <200ms)
EXPLAIN SELECT c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time
FROM classes c
WHERE c.lecturer_id = 5;

-- Check 4: Low Attendance Students (was ~2-3s, should be <500ms)
EXPLAIN SELECT COUNT(*) as low_attendance_students
FROM (
  SELECT u.id,
    COUNT(al.id) / COUNT(DISTINCT cs.id) * 100 as attendance_rate
  FROM users u
  JOIN class_sessions cs ON u.id = cs.student_id
  LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = u.id
  WHERE u.role = 'student'
  GROUP BY u.id
  HAVING attendance_rate < 70
) as low_attendance;

-- ============================================================================
-- 5. NOTES
-- ============================================================================

-- After adding indexes:
-- 1. Run ANALYZE TABLE on affected tables to update statistics
-- 2. Monitor slow query log for any remaining issues
-- 3. Consider adding more indexes if queries still slow
-- 4. Regular database maintenance (OPTIMIZE TABLE, ANALYZE TABLE)

-- ANALYZE TABLE class_sessions;
-- ANALYZE TABLE attendance_logs;
-- ANALYZE TABLE classes;
-- ANALYZE TABLE notifications;
-- ANALYZE TABLE qr_generations;
-- ANALYZE TABLE admin_messages;

-- ============================================================================
-- END OF OPTIMIZATION SCRIPT
-- ============================================================================
