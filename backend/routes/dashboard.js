const express = require('express');
const router = express.Router();

// Dashboard routes
router.get('/student', (req, res) => {
  res.json({ message: 'Get student dashboard', data: {} });
});

router.get('/lecturer', (req, res) => {
  res.json({ message: 'Get lecturer dashboard', data: {} });
});

router.get('/admin', (req, res) => {
  res.json({ message: 'Get admin dashboard', data: {} });
});

module.exports = router;
