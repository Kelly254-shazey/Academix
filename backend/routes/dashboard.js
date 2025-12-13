const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Dashboard routes
router.get('/student', async (req, res) => {
  try {
    // Get student-specific dashboard data
    const db = require('../database');

    // Get enrolled courses
    const [courses] = await db.execute(`
      SELECT c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time,
             u.name as lecturer_name, c.location_lat, c.location_lng
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      WHERE c.id IN (
        SELECT class_id FROM attendance_logs WHERE student_id = ?
        UNION
        SELECT class_id FROM class_sessions cs
        JOIN attendance_logs al ON cs.id = al.session_id
        WHERE al.student_id = ?
      )
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id, req.user.id]);

    res.json({
      success: true,
      message: 'Student dashboard data retrieved',
      data: {
        courses: courses || [],
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/lecturer', async (req, res) => {
  try {
    // Get lecturer-specific dashboard data
    const db = require('../database');

    // Get classes taught by lecturer
    const [classes] = await db.execute(`
      SELECT c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time,
             COUNT(DISTINCT al.student_id) as enrolled_students
      FROM classes c
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      LEFT JOIN attendance_logs al ON cs.id = al.session_id
      WHERE c.lecturer_id = ?
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Lecturer dashboard data retrieved',
      data: {
        classes: classes || [],
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching lecturer dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin', async (req, res) => {
  try {
    // Get admin-specific dashboard data
    const db = require('../database');

    // Get system statistics
    const [stats] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM classes) as total_classes,
        (SELECT COUNT(*) FROM attendance_logs WHERE DATE(checkin_time) = CURDATE()) as today_attendance
    `);

    res.json({
      success: true,
      message: 'Admin dashboard data retrieved',
      data: {
        statistics: stats[0] || {},
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
