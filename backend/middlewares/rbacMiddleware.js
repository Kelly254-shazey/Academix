// rbacMiddleware.js
// Role-based access control middleware
// Enforces permissions based on role-resource-action matrix
// Author: Backend Team
// Date: December 11, 2025

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

/**
 * Verify user has required role(s)
 */
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      logger.warn(`Unauthorized access attempt to ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(user.role)) {
      logger.warn(`Forbidden access: User ${user.id} (${user.role}) attempted ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Verify user has required permission
 * Checks role_permissions table for resource-action combination
 */
exports.requirePermission = (resource, action) => {
  return async (req, res, next) => {
    const user = req.user;

    if (!user) {
      logger.warn(`Unauthorized access attempt to ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    try {
      const conn = await mysql.createPool({
        connectionLimit: 5,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      // Check permission in database
      const [permission] = await conn.query(`
        SELECT * FROM role_permissions
        WHERE role = ? AND resource = ? AND action = ?
      `, [user.role, resource, action]);

      conn.end();

      if (!permission || permission.length === 0) {
        logger.warn(
          `Forbidden: User ${user.id} (${user.role}) lacks permission ` +
          `${resource}:${action} on ${req.method} ${req.path}`
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. Missing permission: ${resource}:${action}`,
        });
      }

      // Store permission in request for logging
      req.permission = permission[0];
      next();
    } catch (error) {
      logger.error('Error in requirePermission middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
      });
    }
  };
};

/**
 * Check if user belongs to specific department
 * Used for HOD and department-scoped access
 */
exports.requireDepartmentAccess = (req, res, next) => {
  const user = req.user;
  const departmentId = req.params.departmentId || req.body.department_id;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Super-admin can access all departments
  if (user.role === 'super-admin') {
    return next();
  }

  // Admin without department assignment can access all
  if (user.role === 'admin' && !user.department_id) {
    return next();
  }

  // HOD can only access their department
  if (user.role === 'hod' && departmentId && user.department_id === parseInt(departmentId)) {
    return next();
  }

  // Department-scoped admin
  if (user.role === 'admin' && departmentId && user.department_id === parseInt(departmentId)) {
    return next();
  }

  logger.warn(
    `Forbidden: User ${user.id} (${user.role}) attempted access to department ${departmentId}`
  );

  return res.status(403).json({
    success: false,
    message: 'Access denied. Not authorized for this department.',
  });
};

/**
 * Audit admin action
 * Logs all admin operations to audit_logs table
 */
exports.auditAction = (resourceType, action) => {
  return async (req, res, next) => {
    const user = req.user;

    // Skip audit for non-admin users
    if (!user || !['super-admin', 'admin', 'system-auditor'].includes(user.role)) {
      return next();
    }

    // Store audit info in request for later logging
    req.auditInfo = {
      user_id: user.id,
      actor_role: user.role,
      action,
      resource_type: resourceType,
      ip_address: req.ip || req.connection.remoteAddress,
      device_id: req.headers['x-device-id'] || 'unknown',
      device_fingerprint: req.headers['x-device-fingerprint'] || null,
      user_agent: req.headers['user-agent'],
      department_id: user.department_id,
      timestamp: new Date(),
    };

    next();
  };
};

/**
 * Log audit action to database
 * Called from route handlers after successful operations
 */
exports.logAuditAction = async (auditInfo, resourceId, resourceName, oldValue, newValue, status = 'success') => {
  try {
    const conn = await mysql.createPool({
      connectionLimit: 5,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await conn.query(`
      INSERT INTO audit_logs (
        user_id, actor_role, action, resource_type, resource_id,
        resource_name, old_value, new_value, ip_address, device_id,
        device_fingerprint, user_agent, status, severity, department_id,
        action_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      auditInfo.user_id,
      auditInfo.actor_role,
      auditInfo.action,
      auditInfo.resource_type,
      resourceId,
      resourceName,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      auditInfo.ip_address,
      auditInfo.device_id,
      auditInfo.device_fingerprint,
      auditInfo.user_agent,
      status,
      'low', // Default severity; adjust per resource type
      auditInfo.department_id,
    ]);

    conn.end();
  } catch (error) {
    logger.error('Error logging audit action:', error);
  }
};

/**
 * Middleware to check if user is admin or higher
 */
exports.requireAdminRole = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const adminRoles = ['super-admin', 'admin'];

  if (!adminRoles.includes(user.role)) {
    logger.warn(`Admin access denied for user ${user.id} (${user.role})`);
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
  }

  next();
};

/**
 * Middleware to check if user is super-admin
 */
exports.requireSuperAdmin = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (user.role !== 'super-admin') {
    logger.warn(`Super-admin access denied for user ${user.id} (${user.role})`);
    return res.status(403).json({
      success: false,
      message: 'Super-admin privileges required',
    });
  }

  next();
};

/**
 * Error handling middleware for RBAC violations
 */
exports.rbacErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('Permission')) {
    logger.warn(`RBAC error: ${err.message}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied: insufficient permissions',
    });
  }

  next(err);
};
