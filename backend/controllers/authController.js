const authService = require('../services/authService');

exports.login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    res.json({ success: true, message: 'Login successful', token, user });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { token, user } = await authService.register(req.body);
    res.status(201).json({ success: true, message: 'Registration successful', token, user });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = await authService.verifyToken(token);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};
