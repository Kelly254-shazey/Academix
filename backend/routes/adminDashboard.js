// adminDashboard.js
// Admin Dashboard API Routes
// GET /api/admin/overview - Admin dashboard overview
// GET /api/admin/users - Get all users with filters
// POST /api/admin/users - Create new user
// PUT /api/admin/users/:userId - Update user
// DELETE /api/admin/users/:userId - Delete user
// GET /api/admin/classes - Get all classes
// POST /api/admin/classes - Create class
// PUT /api/admin/classes/:classId - Update class
// DELETE /api/admin/classes/:classId - Delete class
// GET /api/admin/departments - Get all departments
// POST /api/admin/departments - Create department
// GET /api/admin/reports - Get system reports

const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middlewares/rbacMiddleware');
const logger = require('../utils/logger');
const db = require('../database');

// Middleware: Verify admin role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};

/**
 * GET /api/admin/overview
 * Get admin dashboard overview
 */
router.get('/overview', authMiddleware, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const result = await adminService.getAdminDashboardSummary();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching admin overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/recent-activity
 * Get recent system activity
 */
router.get('/recent-activity', authMiddleware, isAdmin, async (req, res) => {
  try {
    const [activity] = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.role,
        'login' as activity_type,
        created_at
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 20
    `);

    const recentActivity = (activity || []).map(item => ({
      id: item.id,
      user: item.name,
      role: item.role,
      action: 'User logged in',
      timestamp: item.created_at,
      type: 'login'
    }));

    res.status(200).json({
      success: true,
      data: recentActivity
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/attendance-trends
 * Get attendance trends data
 */
router.get('/attendance-trends', authMiddleware, isAdmin, async (req, res) => {
  try {
    const [trends] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
      FROM attendance_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    const attendanceTrends = (trends || []).map(item => ({
      date: item.date,
      present: item.verified || 0,
      absent: (item.total - (item.verified || 0)) || 0
    }));

    res.status(200).json({
      success: true,
      data: attendanceTrends.reverse()
    });
  } catch (error) {
    logger.error('Error fetching attendance trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance trends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with filters
 */
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { role, search, status, department, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (role && role !== 'all') filters.role = role;
    if (status && status !== 'all') filters.status = status;

    const [users] = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at
      FROM users u
      WHERE 1=1
        ${role && role !== 'all' ? `AND u.role = '${role}'` : ''}
        ${search ? `AND (u.name LIKE '%${search}%' OR u.email LIKE '%${search}%')` : ''}
      LIMIT ?, ?
    `, [(page - 1) * limit, parseInt(limit)]);

    res.status(200).json({
      success: true,
      data: {
        users: users || [],
        total: users.length,
        page: parseInt(page),
        limit: parseInt(limit)
      },
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, email, role, password, department_id, student_id, lecturer_id } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and role are required',
      });
    }

    const [existingUser] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const [result] = await db.execute(
      `INSERT INTO users (name, email, role, password, department_id, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name, email, role, password || 'temp123', department_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: result.insertId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update user
 */
router.put('/users/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, department_id } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and role are required',
      });
    }

    await db.execute(
      `UPDATE users SET name = ?, email = ?, role = ?, department_id = ? WHERE id = ?`,
      [name, email, role, department_id || null, userId]
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: userId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user
 */
router.delete('/users/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/classes
 * Get all classes
 */
router.get('/classes', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { department, search, page = 1, limit = 20 } = req.query;

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
        COUNT(DISTINCT cs.id) as total_sessions
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.class_id
      WHERE 1=1
        ${search ? `AND (c.course_code LIKE '%${search}%' OR c.course_name LIKE '%${search}%')` : ''}
      GROUP BY c.id, c.course_code, c.course_name, c.day_of_week, c.start_time, c.end_time, c.location_lat, c.location_lng, u.name
      LIMIT ?, ?
    `, [(page - 1) * limit, parseInt(limit)]);

    res.status(200).json({
      success: true,
      data: {
        classes: classes || [],
        total: classes.length,
        page: parseInt(page),
        limit: parseInt(limit)
      },
    });
  } catch (error) {
    logger.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/classes
 * Create class
 */
router.post('/classes', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { course_code, course_name, lecturer_id, department_id, day_of_week, start_time, end_time } = req.body;

    if (!course_code || !course_name || !lecturer_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const [result] = await db.execute(
      `INSERT INTO classes (course_code, course_name, lecturer_id, department_id, day_of_week, start_time, end_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [course_code, course_name, lecturer_id, department_id || null, day_of_week, start_time, end_time]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: {
        id: result.insertId,
        course_code,
        course_name,
        lecturer_id,
      },
    });
  } catch (error) {
    logger.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/admin/classes/:classId
 * Update class
 */
router.put('/classes/:classId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { course_code, course_name, lecturer_id, day_of_week, start_time, end_time } = req.body;

    await db.execute(
      `UPDATE classes SET course_code = ?, course_name = ?, lecturer_id = ?, day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?`,
      [course_code, course_name, lecturer_id, day_of_week, start_time, end_time, classId]
    );

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: { id: classId },
    });
  } catch (error) {
    logger.error('Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/admin/classes/:classId
 * Delete class
 */
router.delete('/classes/:classId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params;

    await db.execute('DELETE FROM classes WHERE id = ?', [classId]);

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/departments
 * Get all departments
 */
router.get('/departments', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Return empty departments array - departments table doesn't exist in schema yet
    // This can be extended when departments table is created
    res.status(200).json({
      success: true,
      data: {
        departments: []
      },
    });
  } catch (error) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/departments
 * Create department
 */
router.post('/departments', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, code, hod_id } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'name and code are required',
      });
    }

    const [result] = await db.execute(
      `INSERT INTO departments (name, code, hod_id, created_at) VALUES (?, ?, ?, NOW())`,
      [name, code, hod_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        id: result.insertId,
        name,
        code,
      },
    });
  } catch (error) {
    logger.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/profile
 * Get admin profile
 */
router.get('/profile', authMiddleware, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

    const [admin] = await db.execute(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at,
        department_id
      FROM users
      WHERE id = ? AND (role = 'admin' OR role = 'superadmin')
    `, [adminId]);

    if (!admin || admin.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin[0]
    });
  } catch (error) {
    logger.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/profile
 * Update admin profile
 */
router.put('/profile', authMiddleware, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    await db.execute(`
      UPDATE users
      SET name = ?, email = ?
      WHERE id = ? AND (role = 'admin' OR role = 'superadmin')
    `, [name, email, adminId]);

    const [updated] = await db.execute(`
      SELECT id, name, email, role, created_at, department_id
      FROM users
      WHERE id = ?
    `, [adminId]);

    res.status(200).json({
      success: true,
      data: updated[0]
    });
  } catch (error) {
    logger.error('Error updating admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/settings
 * Get admin settings
 */
router.get('/settings', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Return default system settings
    const settings = {
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        attendanceAlerts: true,
        systemAlerts: true,
        userActivityAlerts: false,
        weeklyReports: true
      },
      privacy: {
        profileVisibility: 'admin',
        dataRetention: 365,
        auditLogging: true,
        ipLogging: false
      },
      system: {
        maintenanceMode: false,
        autoBackup: true,
        backupFrequency: 'daily',
        sessionTimeout: 480,
        maxLoginAttempts: 5
      },
      communication: {
        defaultLanguage: 'en',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        emailFromAddress: 'admin@academix.edu'
      }
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update admin settings
 */
router.put('/settings', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    // For now, just return success (settings could be stored in DB or file)
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/reports
 * Get system reports
 */
router.get('/reports', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { type = 'overview', startDate, endDate } = req.query;

    let data = {};

    if (type === 'overview' || type === 'attendance') {
      const [attendanceStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT student_id) as total_students,
          COUNT(*) as total_records,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN verification_status = 'spoofed_location' THEN 1 ELSE 0 END) as flagged
        FROM attendance_logs
      `);
      data.attendance = attendanceStats[0] || {};
    }

    if (type === 'overview' || type === 'users') {
      const [userStats] = await db.execute(`
        SELECT 
          role,
          COUNT(*) as count
        FROM users
        GROUP BY role
      `);
      data.users = userStats || [];
    }

    if (type === 'overview' || type === 'classes') {
      const [classStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_classes,
          COUNT(DISTINCT lecturer_id) as total_lecturers
        FROM classes
      `);
      data.classes = classStats[0] || {};
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;