const express = require('express');
const router = express.Router();

// Class routes
router.get('/', (req, res) => {
  res.json({ message: 'Get all classes', classes: [] });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create class', success: true });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get class by id', class: {} });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update class', success: true });
});

module.exports = router;
