// adminSchemas.js
// Joi validation schemas for admin dashboard endpoints
// Author: Backend Team
// Date: December 11, 2025

const Joi = require('joi');

// Department schemas
const createDepartmentSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  code: Joi.string().required().min(2).max(10).uppercase(),
  description: Joi.string().optional().max(500),
  budget_allocation: Joi.number().optional().min(0),
  location: Joi.string().optional().max(200),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  email: Joi.string().optional().email(),
  website: Joi.string().optional().uri(),
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  description: Joi.string().optional().max(500),
  budget_allocation: Joi.number().optional().min(0),
  location: Joi.string().optional().max(200),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  email: Joi.string().optional().email(),
  website: Joi.string().optional().uri(),
  is_active: Joi.boolean().optional(),
});

const assignHODSchema = Joi.object({
  hod_user_id: Joi.number().required().integer().positive(),
});

// Lecturer schemas
const createLecturerSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  department_id: Joi.number().required().integer().positive(),
});

const updateLecturerSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  department_id: Joi.number().optional().integer().positive(),
  is_active: Joi.boolean().optional(),
});

const assignCoursesSchema = Joi.object({
  course_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .required()
    .min(1),
});

// Student schemas
const createStudentSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  department_id: Joi.number().required().integer().positive(),
});

const updateStudentSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  is_active: Joi.boolean().optional(),
});

const flagStudentSchema = Joi.object({
  flag_type: Joi.string().required().valid(
    'low_attendance',
    'poor_performance',
    'behavioral',
    'financial',
    'medical',
    'other'
  ),
  severity: Joi.string().required().valid('warning', 'critical'),
  description: Joi.string().required().max(500),
});

const transferStudentSchema = Joi.object({
  to_department_id: Joi.number().required().integer().positive(),
  reason: Joi.string().required().max(500),
});

// Broadcast/Notification schemas
const createBroadcastSchema = Joi.object({
  title: Joi.string().required().min(5).max(200),
  message: Joi.string().required().min(10).max(5000),
  content_type: Joi.string().valid('text', 'html', 'json').default('text'),
  target_type: Joi.string().required().valid('all', 'role', 'department', 'class', 'custom'),
  target_roles: Joi.when('target_type', {
    is: 'role',
    then: Joi.array().items(Joi.string()).required(),
    otherwise: Joi.array().items(Joi.string()).optional(),
  }),
  target_departments: Joi.when('target_type', {
    is: 'department',
    then: Joi.array().items(Joi.number().integer().positive()).required(),
    otherwise: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
  target_users: Joi.when('target_type', {
    is: 'custom',
    then: Joi.array().items(Joi.number().integer().positive()).required(),
    otherwise: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduled_at: Joi.date().optional().iso(),
  expires_at: Joi.date().optional().iso(),
});

// Export/Job schemas
const createExportJobSchema = Joi.object({
  export_type: Joi.string().required().valid(
    'students',
    'lecturers',
    'classes',
    'attendance',
    'departments',
    'all_data',
    'audit_logs'
  ),
  file_format: Joi.string().required().valid('csv', 'xlsx', 'pdf', 'json'),
  filter_criteria: Joi.object().optional(),
});

// Audit schemas
const auditLogsFilterSchema = Joi.object({
  user_id: Joi.number().optional().integer().positive(),
  action: Joi.string().optional(),
  resource_type: Joi.string().optional(),
  resource_id: Joi.number().optional().integer().positive(),
  severity: Joi.string().optional().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().optional().valid('success', 'failure', 'partial'),
  startDate: Joi.date().optional().iso(),
  endDate: Joi.date().optional().iso(),
  ip_address: Joi.string().optional().ip(),
  search: Joi.string().optional().max(100),
  limit: Joi.number().optional().integer().min(1).max(1000).default(100),
  offset: Joi.number().optional().integer().min(0).default(0),
});

// System Configuration schemas
const updateSystemConfigSchema = Joi.object({
  config_key: Joi.string().required(),
  config_value: Joi.any().required(),
  data_type: Joi.string().valid('string', 'number', 'boolean', 'json', 'array'),
  category: Joi.string().optional(),
});

const institutionSettingsSchema = Joi.object({
  institution_name: Joi.string().optional().max(200),
  institution_code: Joi.string().optional().max(50),
  institution_logo_url: Joi.string().optional().uri(),
  website: Joi.string().optional().uri(),
  email: Joi.string().optional().email(),
  phone: Joi.string().optional().regex(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().optional().max(500),
  attendance_threshold_percent: Joi.number().optional().min(0).max(100),
  qr_validity_minutes: Joi.number().optional().min(1),
  max_session_delay_minutes: Joi.number().optional().min(0),
  enable_ai_predictions: Joi.boolean().optional(),
  enable_notifications: Joi.boolean().optional(),
  enable_broadcasts: Joi.boolean().optional(),
  session_timeout_minutes: Joi.number().optional().min(5),
  max_login_attempts: Joi.number().optional().min(1),
  password_expiry_days: Joi.number().optional().min(0),
});

// Admin User schemas
const createAdminUserSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8),
  role: Joi.string().required().valid('super-admin', 'admin', 'system-auditor'),
  department_id: Joi.number().optional().integer().positive(),
});

const updateAdminUserSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  role: Joi.string().optional().valid('super-admin', 'admin', 'system-auditor'),
  department_id: Joi.number().optional().integer().positive().allow(null),
  is_active: Joi.boolean().optional(),
});

// Privacy/GDPR schemas
const createPrivacyRequestSchema = Joi.object({
  request_type: Joi.string().required().valid('data_export', 'data_deletion', 'data_portability'),
});

// AI/ML schemas
const createAIJobSchema = Joi.object({
  job_type: Joi.string().required().valid('prediction', 'training', 'evaluation', 'feature_engineering'),
  model_name: Joi.string().required(),
  input_params: Joi.object().optional(),
});

// Pagination helper
const paginationSchema = Joi.object({
  limit: Joi.number().optional().integer().min(1).max(1000).default(50),
  offset: Joi.number().optional().integer().min(0).default(0),
});

// Date range helper
const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional().iso(),
  endDate: Joi.date().optional().iso(),
});

module.exports = {
  // Department
  createDepartmentSchema,
  updateDepartmentSchema,
  assignHODSchema,

  // Lecturer
  createLecturerSchema,
  updateLecturerSchema,
  assignCoursesSchema,

  // Student
  createStudentSchema,
  updateStudentSchema,
  flagStudentSchema,
  transferStudentSchema,

  // Broadcast
  createBroadcastSchema,

  // Export
  createExportJobSchema,

  // Audit
  auditLogsFilterSchema,

  // Configuration
  updateSystemConfigSchema,
  institutionSettingsSchema,

  // Admin User
  createAdminUserSchema,
  updateAdminUserSchema,

  // Privacy
  createPrivacyRequestSchema,

  // AI
  createAIJobSchema,

  // Helpers
  paginationSchema,
  dateRangeSchema,
};
