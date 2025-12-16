const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const { sendSuccess, sendError, sendValidationError } = require('../utils/responseHelper');
const classController = require('../controllers/classController');

// GET /classes - list classes (public, no auth required for listing)
router.get('/', classController.getAllClasses);

// GET /classes/lecturer - get classes for current lecturer
router.get('/lecturer', authenticateToken, async (req, res) => {
  try {
    const db = require('../database');

    const [classes] = await db.execute(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.day_of_week,
        c.start_time,
        c.end_time,
        c.location_lat,
        c.location_lng,
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
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time, c.location_lat, c.location_lng
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id]);

    return sendSuccess(res, 'Lecturer classes retrieved successfully', classes || []);
  } catch (error) {
    console.error('Error fetching lecturer classes:', error);
    return sendError(res, 'Failed to fetch lecturer classes', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST /classes - create a class (admin/lecturer only)
router.post('/', authenticateToken, classController.createClass);

// GET /classes/:id - get class by id
router.get('/:id', classController.getClassById);

// PUT /classes/:id - update class (lecturer/admin only)
router.put('/:id', authenticateToken, classController.updateClass);

// DELETE /classes/:id - delete class (admin only)
router.delete('/:id', authenticateToken, classController.deleteClass);

// POST /classes/:classId/sessions - create a class session (lecturer/admin only)
router.post('/:classId/sessions', authenticateToken, classController.createSession);

// POST /classes/:classId/sessions/:sessionId/scan - student scans QR (student only)
router.post('/:classId/sessions/:sessionId/scan', authenticateToken, classController.scanSession);

// GET /classes/available - get available classes for enrollment (students)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const db = require('../database');

    const [classes] = await db.execute(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.day_of_week,
        c.start_time,
        c.end_time,
        c.location_lat,
        c.location_lng,
        u.name as lecturer_name,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        CASE WHEN ce2.student_id IS NOT NULL THEN 1 ELSE 0 END as is_enrolled
      FROM classes c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id
      LEFT JOIN class_enrollments ce2 ON c.id = ce2.class_id AND ce2.student_id = ?
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time, c.location_lat, c.location_lng, u.name, ce2.student_id
      ORDER BY c.day_of_week, c.start_time
    `, [req.user.id]);

    return sendSuccess(res, 'Available classes retrieved successfully', classes || []);
  } catch (error) {
    console.error('Error fetching available classes:', error);
    return sendError(res, 'Failed to fetch available classes', 500, process.env.NODE_ENV === 'development', error);
  }
});

// POST /classes/:classId/enroll - enroll in a class
router.post('/:classId/enroll', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user.id;
    const db = require('../database');

    // Check if already enrolled
    const [existing] = await db.execute(
      'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (existing.length > 0) {
      return sendValidationError(res, 'Already enrolled in this class');
    }

    // Enroll the student
    await db.execute(
      'INSERT INTO class_enrollments (class_id, student_id, enrolled_at) VALUES (?, ?, NOW())',
      [classId, studentId]
    );

    return sendSuccess(res, 'Successfully enrolled in class', null, 201);
  } catch (error) {
    console.error('Error enrolling in class:', error);
    return sendError(res, 'Failed to enroll in class', 500, process.env.NODE_ENV === 'development', error);
  }
});

// DELETE /classes/:classId/enroll - unenroll from a class
router.delete('/:classId/enroll', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user.id;
    const db = require('../database');

    const [result] = await db.execute(
      'DELETE FROM class_enrollments WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (result.affectedRows === 0) {
      return sendError(res, 'Not enrolled in this class', 404);
    }

    return sendSuccess(res, 'Successfully unenrolled from class');
  } catch (error) {
    console.error('Error unenrolling from class:', error);
    return sendError(res, 'Failed to unenroll from class', 500, process.env.NODE_ENV === 'development', error);
  }
});

module.exports = router;
