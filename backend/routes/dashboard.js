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
        c.class_code,
        c.course_name,
        u.name as instructor,
        c.location,
        c.latitude,
        c.longitude,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN al.status = 'present' OR al.status = 'late' THEN 1 ELSE 0 END) as attended_sessions,
        ROUND(
          (SUM(CASE WHEN al.status = 'present' OR al.status = 'late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(DISTINCT cs.id), 0),
          1
        ) as attendance_percentage,
        MAX(al.checkin_time) as last_attendance
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      LEFT JOIN attendance_logs al ON cs.id = al.class_session_id AND al.student_id = ?
      WHERE c.id IN (
        SELECT DISTINCT class_id
        FROM course_enrollments
        WHERE student_id = ?
      )
      GROUP BY c.id, c.class_code, c.course_name, u.name, c.location, c.latitude, c.longitude
      ORDER BY c.class_code
    `, [req.user.id, req.user.id]);

    // Get today's classes with real-time status
    const [todayClasses] = await db.execute(`
      SELECT
        c.id,
        c.class_code,
        c.course_name,
        cs.start_time,
        cs.end_time,
        c.location,
        c.latitude,
        c.longitude,
        u.name as instructor,
        cs.id as session_id,
        CASE
          WHEN al.id IS NOT NULL THEN 'checked_in'
          ELSE 'not_checked_in'
        END as checkin_status,
        CASE
          WHEN CURTIME() BETWEEN cs.start_time AND cs.end_time THEN 'active'
          ELSE 'upcoming'
        END as status
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      JOIN class_sessions cs ON c.id = cs.class_id AND DATE(cs.start_time) = CURDATE()
      LEFT JOIN attendance_logs al ON cs.id = al.class_session_id AND al.student_id = ?
      WHERE c.id IN (
        SELECT DISTINCT class_id
        FROM course_enrollments
        WHERE student_id = ?
      )
      ORDER BY cs.start_time
    `, [req.user.id, req.user.id]);

    // Get recent notifications for the student
    const [notifications] = await db.execute(`
      SELECT id, type, title, message, is_read, created_at
      FROM notifications
      WHERE student_id = ?
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
        c.class_code,
        c.course_name,
        c.status,
        COUNT(DISTINCT cerol.student_id) as enrolled_students,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN DATE(cs.start_time) = CURDATE() AND al.id IS NOT NULL THEN al.id END) as today_attendance,
        ROUND(
          (SUM(CASE WHEN al.status = 'present' OR al.status = 'late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(DISTINCT cs.id), 0),
          1
        ) as attendance_rate
      FROM classes c
      LEFT JOIN course_enrollments cerol ON c.id = cerol.class_id
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      LEFT JOIN attendance_logs al ON cs.id = al.class_session_id
      WHERE c.lecturer_id = ?
      GROUP BY c.id, c.class_code, c.course_name, c.status
      ORDER BY c.class_code
    `, [req.user.id]);

    // Get pending attendance actions (sessions without QR codes or expired)
    const [pendingActions] = await db.execute(`
      SELECT
        cs.id as session_id,
        c.class_code,
        c.course_name,
        cs.start_time as session_date,
        cs.qr_expiry,
        CASE
          WHEN cs.qr_code IS NULL THEN 'no_qr'
          WHEN cs.qr_expiry < NOW() THEN 'expired_qr'
          ELSE 'active'
        END as status
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      WHERE c.lecturer_id = ?
        AND DATE(cs.start_time) >= CURDATE()
        AND (cs.qr_code IS NULL OR cs.qr_expiry < NOW())
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
          class: cls.class_code,
          attendance: cls.attendance_rate || 0
        })),
        overallAttendance: classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.attendance_rate || 0), 0) / classes.length) : 0,
        totalClasses: classes.length,
        todaysSchedule: classes.filter(cls => cls.status === 'active').map(cls => ({
          course: `${cls.class_code} - ${cls.course_name}`,
          time: `${cls.start_time} - ${cls.end_time}`,
          status: cls.status
        })),
        classRosters: classes.map(cls => ({
          className: cls.class_code,
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
