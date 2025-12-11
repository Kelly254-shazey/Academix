const express = require('express');
const router = express.Router();

const classController = require('../controllers/classController');


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

module.exports = router;
