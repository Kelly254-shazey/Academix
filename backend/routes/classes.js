const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');

const classController = require('../controllers/classController');


// GET /classes - list classes
router.get('/', classController.getAllClasses);

// GET /classes/lecturer - get classes for current lecturer
router.get('/lecturer', authMiddleware, requireRole('lecturer'), async (req, res) => {
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

    res.json({
      success: true,
      message: 'Lecturer classes retrieved successfully',
      data: classes || []
    });
  } catch (error) {
    console.error('Error fetching lecturer classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// GET /classes - list classes
router.get('/', classController.getAllClasses);


// POST /classes - create a class
router.post('/', classController.createClass);


// GET /classes/:id - get class by id
router.get('/:id', classController.getClassById);


// PUT /classes/:id - update class
router.put('/:id', classController.updateClass);

// DELETE /classes/:id - delete class
router.delete('/:id', classController.deleteClass);


// POST /classes/:classId/sessions - create a class session
router.post('/:classId/sessions', classController.createSession);


// POST /classes/:classId/sessions/:sessionId/scan
router.post('/:classId/sessions/:sessionId/scan', classController.scanSession);

// Student enrollment routes
// GET /classes/available - get available classes for enrollment (students)
router.get('/available', authMiddleware, requireRole('student'), async (req, res) => {
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

    res.json({
      success: true,
      message: 'Available classes retrieved successfully',
      data: classes || []
    });
  } catch (error) {
    console.error('Error fetching available classes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /classes/:classId/enroll - enroll in a class
router.post('/:classId/enroll', authMiddleware, requireRole('student'), async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this class'
      });
    }

    // Enroll the student
    await db.execute(
      'INSERT INTO class_enrollments (class_id, student_id, enrolled_at) VALUES (?, ?, NOW())',
      [classId, studentId]
    );

    res.json({
      success: true,
      message: 'Successfully enrolled in class'
    });
  } catch (error) {
    console.error('Error enrolling in class:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /classes/:classId/enroll - unenroll from a class
router.delete('/:classId/enroll', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user.id;
    const db = require('../database');

    const [result] = await db.execute(
      'DELETE FROM class_enrollments WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this class'
      });
    }

    res.json({
      success: true,
      message: 'Successfully unenrolled from class'
    });
  } catch (error) {
    console.error('Error unenrolling from class:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
