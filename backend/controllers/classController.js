const classService = require('../services/classService');

exports.getAllClasses = async (req, res, next) => {
  try {
    const classes = await classService.getAllClasses();
    res.json({ message: 'Classes fetched', classes });
  } catch (err) {
    next(err);
  }
};

exports.createClass = async (req, res, next) => {
  try {
    const classId = await classService.createClass(req.body);
    res.status(201).json({ message: 'Class created', classId });
  } catch (err) {
    next(err);
  }
};

exports.getClassById = async (req, res, next) => {
  try {
    const classObj = await classService.getClassById(req.params.id);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: classObj });
  } catch (err) {
    next(err);
  }
};

exports.updateClass = async (req, res, next) => {
  try {
    const affectedRows = await classService.updateClass(req.params.id, req.body);
    res.json({ message: 'Class updated', affectedRows });
  } catch (err) {
    next(err);
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    const affectedRows = await classService.deleteClass(req.params.id);
    if (affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Class deleted successfully', affectedRows });
  } catch (err) {
    next(err);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const sessionId = await classService.createSession(req.params.classId, req.body);
    res.status(201).json({ message: 'Session created', sessionId });
  } catch (err) {
    next(err);
  }
};

exports.scanSession = async (req, res, next) => {
  try {
    const attendanceId = await classService.scanSession(req.params.classId, req.params.sessionId, req.body);
    res.status(201).json({ message: 'Scan recorded', attendanceId });
  } catch (err) {
    next(err);
  }
};
