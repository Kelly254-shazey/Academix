const express = require('express');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');
const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Dashboard routes
router.get('/student', requireRole('student'), async (req, res) => {
  try {
    // Get student-specific dashboard data
    const db = require('../database');

    // Get enrolled courses with attendance stats
    const [courses] = await db.execute(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.day_of_week,
        c.start_time,
        c.end_time,
        u.name as lecturer_name,
        c.location_lat,
        c.location_lng,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT al.id) as attended_sessions,
        ROUND(
          (COUNT(DISTINCT al.id) * 100.0) / NULLIF(COUNT(DISTINCT cs.id), 0),
          1
        ) as attendance_percentage,
        MAX(al.checkin_time) as last_attendance
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
      WHERE c.id IN (
        SELECT DISTINCT cs2.class_id
        FROM class_sessions cs2
        JOIN attendance_logs al2 ON cs2.id = al2.session_id
        WHERE al2.student_id = ?
      )
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time, u.name, c.location_lat, c.location_lng
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id, req.user.id]);

    // Get today's classes with real-time status
    const [todayClasses] = await db.execute(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.start_time,
        c.end_time,
        c.location_lat,
        c.location_lng,
        u.name as lecturer_name,
        cs.id as session_id,
        CASE
          WHEN al.id IS NOT NULL THEN 'checked_in'
          ELSE 'not_checked_in'
        END as checkin_status,
        CASE
          WHEN TIME(NOW()) BETWEEN c.start_time AND c.end_time THEN 'active'
          ELSE 'upcoming'
        END as status
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      JOIN class_sessions cs ON c.id = cs.class_id AND DATE(cs.session_date) = CURDATE()
      LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
      WHERE c.id IN (
        SELECT DISTINCT cs2.class_id
        FROM class_sessions cs2
        JOIN attendance_logs al2 ON cs2.id = al2.session_id
        WHERE al2.student_id = ?
      )
      ORDER BY c.start_time
    `, [req.user.id, req.user.id]);

    // Get recent notifications for the student
    const [notifications] = await db.execute(`
      SELECT id, type, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Calculate overall attendance stats
    const totalCourses = courses.length;
    const overallAttendance = totalCourses > 0 ?
      courses.reduce((sum, course) => sum + (course.attendance_percentage || 0), 0) / totalCourses : 0;

    res.json({
      success: true,
      message: 'Student dashboard data retrieved',
      data: {
        courses: courses || [],
        todayClasses: todayClasses || [],
        notifications: notifications || [],
        summary: {
          totalCourses,
          overallAttendance: Math.round(overallAttendance * 10) / 10,
          todayClassesCount: todayClasses.length,
          unreadNotifications: notifications.filter(n => !n.is_read).length
        },
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/lecturer', requireRole('lecturer'), async (req, res) => {
  try {
    // Get lecturer-specific dashboard data
    const db = require('../database');

    // Get classes taught by lecturer with comprehensive stats
    const [classes] = await db.execute(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.day_of_week,
        c.start_time,
        c.end_time,
        COUNT(DISTINCT al.student_id) as enrolled_students,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN DATE(cs.session_date) = CURDATE() THEN al.id END) as today_attendance,
        ROUND(
          (COUNT(DISTINCT al.id) * 100.0) / NULLIF(COUNT(DISTINCT cs.id), 0),
          1
        ) as attendance_rate
      FROM classes c
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      LEFT JOIN attendance_logs al ON cs.id = al.session_id
      WHERE c.lecturer_id = ?
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id]);

    // Get pending attendance actions (sessions without QR codes or expired)
    const [pendingActions] = await db.execute(`
      SELECT
        cs.id as session_id,
        c.course_code,
        c.course_name,
        cs.session_date,
        cs.qr_expires_at,
        CASE
          WHEN cs.qr_expires_at IS NULL THEN 'no_qr'
          WHEN cs.qr_expires_at < NOW() THEN 'expired_qr'
          ELSE 'active'
        END as status
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE c.lecturer_id = ?
        AND cs.session_date >= CURDATE()
        AND (cs.qr_expires_at IS NULL OR cs.qr_expires_at < NOW())
      ORDER BY cs.session_date, c.start_time
      LIMIT 10
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Lecturer dashboard data retrieved',
      data: {
        lecturerName: req.user.name,
        classes: classes || [],
        pendingActions: pendingActions || [],
        summary: {
          totalClasses: classes.length,
          totalSessions: classes.reduce((sum, cls) => sum + (cls.total_sessions || 0), 0),
          totalStudents: classes.reduce((sum, cls) => sum + (cls.enrolled_students || 0), 0),
          todayAttendance: classes.reduce((sum, cls) => sum + (cls.today_attendance || 0), 0)
        },
        attendanceData: classes.map(cls => ({
          class: cls.course_code,
          attendance: cls.attendance_rate || 0
        })),
        overallAttendance: classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.attendance_rate || 0), 0) / classes.length) : 0,
        totalClasses: classes.length,
        todaysSchedule: classes.filter(cls => cls.day_of_week === new Date().toLocaleLowerCase('en-US', { weekday: 'long' })).map(cls => ({
          course: `${cls.course_code} - ${cls.course_name}`,
          time: `${cls.start_time} - ${cls.end_time}`,
          status: 'upcoming' // This would need logic to determine actual status
        })),
        classRosters: classes.map(cls => ({
          className: cls.course_code,
          studentCount: cls.enrolled_students || 0
        })),
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching lecturer dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin', requireRole('admin'), async (req, res) => {
  try {
    // Get admin-specific dashboard data
    const db = require('../database');

    // Get comprehensive system statistics in one query
    const [stats] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'lecturer') as total_lecturers,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM classes) as total_classes,
        (SELECT COUNT(*) FROM attendance_logs) as total_attendance_records,
        (SELECT COUNT(*) FROM attendance_logs WHERE DATE(checkin_time) = CURDATE()) as today_attendance,
        (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE) as unread_notifications
    `);

    // Get recent system alerts (last 5 notifications)
    const [recentAlerts] = await db.execute(`
      SELECT id, type, title, message, created_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      message: 'Admin dashboard data retrieved',
      data: {
        statistics: stats[0] || {},
        recentAlerts: recentAlerts || [],
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
