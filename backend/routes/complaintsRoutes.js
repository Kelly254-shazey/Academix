const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ============================================================
// ANONYMOUS COMPLAINT SUBMISSION (No auth required)
// ============================================================
router.post('/submit', async (req, res) => {
  try {
    const { message, category } = req.body;
    
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters long' });
    }

    await db.execute(`
      INSERT INTO complaints (message, category, anonymous, status)
      VALUES (?, ?, TRUE, 'pending')
    `, [message.trim(), category || 'other']);

    res.json({ message: 'Complaint submitted successfully. Thank you for your feedback.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

// ============================================================
// AUTHENTICATED COMPLAINT SUBMISSION
// ============================================================
router.post('/submit-authenticated', authenticateToken, async (req, res) => {
  try {
    const { message, category, anonymous } = req.body;
    
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters long' });
    }

    const studentId = anonymous ? null : req.user.id;

    await db.execute(`
      INSERT INTO complaints (message, category, student_id, anonymous, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [message.trim(), category || 'other', studentId, anonymous || false]);

    res.json({ message: 'Complaint submitted successfully. Thank you for your feedback.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

// ============================================================
// GET USER'S COMPLAINTS (Authenticated)
// ============================================================
router.get('/my-complaints', authenticateToken, async (req, res) => {
  try {
    const [complaints] = await db.execute(`
      SELECT id, message, category, status, created_at, updated_at, resolution_notes
      FROM complaints 
      WHERE student_id = ? AND anonymous = FALSE
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ data: complaints });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// ============================================================
// COMPLAINT STATISTICS (Public)
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed
      FROM complaints
    `);

    const [categories] = await db.execute(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      overview: stats[0],
      categories: categories
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;