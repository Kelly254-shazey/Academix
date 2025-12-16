const express = require('express');
const router = express.Router();
const db = require('../../backend/database');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================
router.get('/overview', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const [sessions] = await db.execute('SELECT COUNT(*) as count FROM class_sessions WHERE DATE(start_time) = CURDATE()');
    
    const totalUsers = users.reduce((sum, u) => sum + u.count, 0);
    const studentCount = users.find(u => u.role === 'student')?.count || 0;
    const lecturerCount = users.find(u => u.role === 'lecturer')?.count || 0;
    const activeSessions = sessions[0]?.count || 0;

    res.json({
      totalUsers,
      studentCount,
      lecturerCount,
      activeSessions,
      systemHealth: { database: 95, server: 98, api: 97 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// USER MANAGEMENT
// ============================================================
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, name, email, role, active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COMMUNICATIONS
// ============================================================
router.post('/communications/send', async (req, res) => {
  try {
    const { recipientRole, messageType, subject, message, priority } = req.body;
    
    // Insert communication
    const [result] = await db.execute(`
      INSERT INTO communications (sender_id, recipient_role, message_type, subject, message, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, recipientRole, messageType, subject, message, priority || 'normal']);

    const communicationId = result.insertId;

    // Get recipients based on role
    let roleFilter = '';
    if (recipientRole === 'students') roleFilter = "role = 'student'";
    else if (recipientRole === 'lecturers') roleFilter = "role = 'lecturer'";
    else if (recipientRole === 'admins') roleFilter = "role = 'admin'";
    else roleFilter = "1=1"; // all users

    const [recipients] = await db.execute(`SELECT id FROM users WHERE ${roleFilter} AND active = 1`);

    // Insert recipients
    for (const recipient of recipients) {
      await db.execute(`
        INSERT INTO communication_recipients (communication_id, recipient_id)
        VALUES (?, ?)
      `, [communicationId, recipient.id]);

      // Also insert into notifications table for students
      if (recipient.id !== req.user.id) {
        await db.execute(`
          INSERT INTO notifications (student_id, title, message, type, priority)
          VALUES (?, ?, ?, ?, ?)
        `, [recipient.id, subject, message, messageType, priority || 'normal']);
      }
    }

    res.json({ message: 'Communication sent successfully', id: communicationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COMPLAINTS MANAGEMENT
// ============================================================
router.get('/complaints', async (req, res) => {
  try {
    const [complaints] = await db.execute(`
      SELECT c.*, u.name as student_name 
      FROM complaints c
      LEFT JOIN users u ON c.student_id = u.id
      ORDER BY c.created_at DESC
    `);
    res.json({ data: complaints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/complaints/:id', async (req, res) => {
  try {
    const { status, resolution_notes } = req.body;
    const resolvedAt = status === 'resolved' ? new Date() : null;
    
    await db.execute(`
      UPDATE complaints 
      SET status = ?, resolution_notes = ?, resolved_at = ?, assigned_to = ?
      WHERE id = ?
    `, [status, resolution_notes, resolvedAt, req.user.id, req.params.id]);

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REPORTS TO SUPER ADMIN
// ============================================================
router.post('/reports/super-admin', async (req, res) => {
  try {
    const { type, subject, content } = req.body;
    
    await db.execute(`
      INSERT INTO admin_reports (admin_id, type, subject, content)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, type, subject, content]);

    res.json({ message: 'Report sent to super admin successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DEPARTMENT MANAGEMENT
// ============================================================
router.get('/department/:dept/issues', async (req, res) => {
  try {
    const [issues] = await db.execute(`
      SELECT di.*, u1.name as created_by_name, u2.name as assigned_to_name
      FROM department_issues di
      LEFT JOIN users u1 ON di.created_by = u1.id
      LEFT JOIN users u2 ON di.assigned_to = u2.id
      WHERE di.department = ?
      ORDER BY di.created_at DESC
    `, [req.params.dept]);
    
    res.json({ data: issues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/department/issues', async (req, res) => {
  try {
    const { title, description, priority, department } = req.body;
    
    const [result] = await db.execute(`
      INSERT INTO department_issues (department, title, description, priority, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [department, title, description, priority, req.user.id]);

    res.json({ message: 'Issue created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/department/issues/:id', async (req, res) => {
  try {
    const { status, resolution_notes } = req.body;
    const resolvedAt = status === 'resolved' ? new Date() : null;
    
    await db.execute(`
      UPDATE department_issues 
      SET status = ?, resolution_notes = ?, resolved_at = ?
      WHERE id = ?
    `, [status, resolution_notes, resolvedAt, req.params.id]);

    res.json({ message: 'Issue updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AUDIT LOGS
// ============================================================
router.get('/audit-log', async (req, res) => {
  try {
    const [logs] = await db.execute(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 100
    `);
    res.json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ANALYTICS & REPORTS
// ============================================================
router.get('/reports', async (req, res) => {
  try {
    const [attendance] = await db.execute(`
      SELECT AVG(attendance_percentage) as averageAttendance
      FROM student_attendance_analytics
    `);

    const [riskDistribution] = await db.execute(`
      SELECT 
        SUM(CASE WHEN attendance_percentage >= 80 THEN 1 ELSE 0 END) as lowRisk,
        SUM(CASE WHEN attendance_percentage BETWEEN 60 AND 79 THEN 1 ELSE 0 END) as mediumRisk,
        SUM(CASE WHEN attendance_percentage BETWEEN 40 AND 59 THEN 1 ELSE 0 END) as highRisk,
        SUM(CASE WHEN attendance_percentage < 40 THEN 1 ELSE 0 END) as critical
      FROM student_attendance_analytics
    `);

    res.json({
      averageAttendance: Math.round(attendance[0]?.averageAttendance || 0),
      ...riskDistribution[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PROFILE & SETTINGS
// ============================================================
router.put('/profile', async (req, res) => {
  try {
    const { name, email, phone, department, bio } = req.body;
    
    await db.execute(`
      UPDATE users 
      SET name = ?, email = ?, phone = ?, department = ?, bio = ?
      WHERE id = ?
    `, [name, email, phone, department, bio, req.user.id]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { notifications, autoRefresh, theme, language } = req.body;
    
    await db.execute(`
      INSERT INTO admin_settings (admin_id, notifications, auto_refresh, theme, language)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      notifications = VALUES(notifications),
      auto_refresh = VALUES(auto_refresh),
      theme = VALUES(theme),
      language = VALUES(language)
    `, [req.user.id, notifications, autoRefresh, theme, language]);

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const [settings] = await db.execute(`
      SELECT * FROM admin_settings WHERE admin_id = ?
    `, [req.user.id]);

    res.json(settings[0] || {
      notifications: true,
      auto_refresh: false,
      theme: 'light',
      language: 'en'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;