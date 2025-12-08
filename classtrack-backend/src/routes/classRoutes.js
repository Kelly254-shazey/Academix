/**
 * Class Routes
 */

const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/ClassController');
const { authenticateToken, verifyRole } = require('../middleware/auth');

// Lecturer routes
router.post('/', authenticateToken, verifyRole(['lecturer']), ClassController.createClass);
router.get('/my-classes', authenticateToken, verifyRole(['lecturer']), ClassController.getMyClasses);
router.post('/:classId/start-session', authenticateToken, verifyRole(['lecturer']), ClassController.startSession);
router.post('/:classId/sessions/:sessionId/end', authenticateToken, verifyRole(['lecturer']), ClassController.endSession);
router.post('/:classId/sessions/:sessionId/cancel', authenticateToken, verifyRole(['lecturer']), ClassController.cancelSession);

// Public routes (for fetching class info)
router.get('/:classId/upcoming-sessions', authenticateToken, ClassController.getUpcomingSessions);

module.exports = router;
