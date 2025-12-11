const Joi = require('joi');

// Attendance Schemas
const attendanceCheckinSchema = Joi.object({
  session_id: Joi.number().required(),
  latitude: Joi.number().precision(8).allow(null),
  longitude: Joi.number().precision(8).allow(null),
  browser_fingerprint: Joi.string().allow(null),
  device_name: Joi.string().max(255),
});

const attendanceAnalyticsSchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().min(Joi.ref('start_date')).required(),
  course_id: Joi.number(),
  include_trends: Joi.boolean().default(false),
});

// Profile Schemas
const updateProfileSchema = Joi.object({
  bio: Joi.string().max(500).allow(''),
  phone: Joi.string().regex(/^\d{10,20}$/).allow(null),
  avatar_url: Joi.string().uri().allow(null),
});

const deviceManagementSchema = Joi.object({
  device_fingerprint: Joi.string().required(),
  device_name: Joi.string().max(255).required(),
  remove: Joi.boolean().default(false),
});

// Settings Schemas
const updateSettingsSchema = Joi.object({
  notifications_enabled: Joi.boolean(),
  email_notifications: Joi.boolean(),
  push_notifications: Joi.boolean(),
  sms_notifications: Joi.boolean(),
  dark_mode: Joi.boolean(),
  timezone: Joi.string().max(50),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required(),
});

// Support Ticket Schemas
const createTicketSchema = Joi.object({
  category: Joi.string().valid('attendance', 'technical', 'general', 'other').required(),
  subject: Joi.string().max(255).required(),
  description: Joi.string().max(2000).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
});

const updateTicketSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  assigned_admin_id: Joi.number().allow(null),
});

const addTicketResponseSchema = Joi.object({
  response_text: Joi.string().max(2000).required(),
  is_internal: Joi.boolean().default(false),
});

// Notification Schemas
const notificationPreferenceSchema = Joi.object({
  type: Joi.string().valid('class_alert', 'attendance_warning', 'message', 'announcement').required(),
  enabled: Joi.boolean().required(),
});

const markNotificationSchema = Joi.object({
  ids: Joi.array().items(Joi.number()).required(),
  is_read: Joi.boolean().required(),
});

// Calendar Event Schemas
const createEventSchema = Joi.object({
  title: Joi.string().max(255).required(),
  event_type: Joi.string().valid('class', 'exam', 'academic_activity', 'holiday').required(),
  class_id: Joi.number().allow(null),
  start_date: Joi.date().required(),
  end_date: Joi.date().min(Joi.ref('start_date')).required(),
  start_time: Joi.string().pattern(/^\d{2}:\d{2}$/).allow(null),
  end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).allow(null),
  location: Joi.string().max(255).allow(null),
  description: Joi.string().max(2000).allow(null),
});

// Daily Schedule Query Schema
const scheduleQuerySchema = Joi.object({
  date: Joi.date().default(() => new Date()),
  timezone: Joi.string().default('UTC'),
});

// QR Validation Schema
const qrValidationSchema = Joi.object({
  qr_token: Joi.string().required(),
  latitude: Joi.number().precision(8).allow(null),
  longitude: Joi.number().precision(8).allow(null),
  device_fingerprint: Joi.string().allow(null),
});

// Analytics Query Schema
const analyticsQuerySchema = Joi.object({
  start_date: Joi.date(),
  end_date: Joi.date(),
  class_id: Joi.number(),
  limit: Joi.number().default(10).max(100),
  offset: Joi.number().default(0),
});

module.exports = {
  attendanceCheckinSchema,
  attendanceAnalyticsSchema,
  updateProfileSchema,
  deviceManagementSchema,
  updateSettingsSchema,
  changePasswordSchema,
  createTicketSchema,
  updateTicketSchema,
  addTicketResponseSchema,
  notificationPreferenceSchema,
  markNotificationSchema,
  createEventSchema,
  scheduleQuerySchema,
  qrValidationSchema,
  analyticsQuerySchema,
};
