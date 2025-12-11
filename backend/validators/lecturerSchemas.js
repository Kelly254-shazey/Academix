// lecturerSchemas.js
// Joi validation schemas for Lecturer Dashboard endpoints
// Author: Backend Team
// Date: December 11, 2025

const Joi = require('joi');

// Lecturer check-in schema
const lecturerCheckinSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
  deviceName: Joi.string().optional(),
  deviceType: Joi.string()
    .valid('mobile', 'tablet', 'laptop', 'desktop')
    .optional(),
  ipAddress: Joi.string().optional(),
});

// Session control schema (start/delay/cancel/room-change)
const sessionControlSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  reason: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
});

// Session start schema
const sessionStartSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Session delay schema
const sessionDelaySchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  delayMinutes: Joi.number().integer().positive().max(480).required(), // Max 8 hours
  reason: Joi.string().max(500).required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Session cancel schema
const sessionCancelSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  reason: Joi.string().max(500).required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Room change schema
const roomChangeSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  newRoom: Joi.string().max(50).required(),
  reason: Joi.string().max(500).optional(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// QR generation schema
const qrGenerationSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  validityMinutes: Joi.number().integer().min(1).max(120).optional(),
});

// QR token validation schema
const qrValidationSchema = Joi.object({
  qrToken: Joi.string().required(),
  signature: Joi.string().required(),
  sessionId: Joi.number().integer().positive().required(),
  classId: Joi.number().integer().positive().required(),
});

// Lecturer check-in (QR) schema
const lecturerQRCheckinSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  qrToken: Joi.string().required(),
  signature: Joi.string().required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Attendance verification schema
const attendanceVerificationSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  studentId: Joi.number().integer().positive().required(),
  attendanceId: Joi.number().integer().positive().required(),
  verificationReason: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Attendance unverification schema
const attendanceUnverifySchema = Joi.object({
  attendanceId: Joi.number().integer().positive().required(),
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  reason: Joi.string().max(500).optional(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Mark single attendance schema
const markAttendanceSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  studentId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid('present', 'absent', 'excused', 'late')
    .required(),
  reason: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Bulk mark attendance schema
const bulkMarkAttendanceSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  markings: Joi.array()
    .items(
      Joi.object({
        studentId: Joi.number().integer().positive().required(),
        status: Joi.string()
          .valid('present', 'absent', 'excused', 'late')
          .required(),
        reason: Joi.string().max(500).optional(),
        notes: Joi.string().max(1000).optional(),
      })
    )
    .min(1)
    .max(500)
    .required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Roster request schema
const rosterRequestSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
});

// Alert acknowledgement schema
const alertAcknowledgeSchema = Joi.object({
  alertIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required(),
});

// Lecturer device registration schema
const lecturerDeviceSchema = Joi.object({
  deviceFingerprint: Joi.string().required(),
  deviceName: Joi.string().max(100).optional(),
  deviceType: Joi.string()
    .valid('mobile', 'tablet', 'laptop', 'desktop')
    .optional(),
  isTrusted: Joi.boolean().optional(),
});

// Get lecturer overview schema
const lecturerOverviewSchema = Joi.object({
  lecturerId: Joi.number().integer().positive().required(),
});

// Get lecturer statistics schema
const lecturerStatsSchema = Joi.object({
  lecturerId: Joi.number().integer().positive().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

// Scanning toggle schema
const toggleScanningSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  enabled: Joi.boolean().required(),
  deviceId: Joi.string().required(),
  deviceFingerprint: Joi.string().required(),
});

// Report generation schema
const reportGenerationSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  format: Joi.string().valid('csv', 'pdf', 'json').required(),
  includeDetails: Joi.boolean().optional(),
});

// Attendance filter schema
const attendanceFilterSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  sessionId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid('present', 'absent', 'excused', 'late', 'unmarked')
    .optional(),
  verified: Joi.boolean().optional(),
});

// At-risk students schema
const atRiskStudentsSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  attendanceThreshold: Joi.number().integer().min(0).max(100).optional(),
});

module.exports = {
  lecturerCheckinSchema,
  sessionControlSchema,
  sessionStartSchema,
  sessionDelaySchema,
  sessionCancelSchema,
  roomChangeSchema,
  qrGenerationSchema,
  qrValidationSchema,
  lecturerQRCheckinSchema,
  attendanceVerificationSchema,
  attendanceUnverifySchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  rosterRequestSchema,
  alertAcknowledgeSchema,
  lecturerDeviceSchema,
  lecturerOverviewSchema,
  lecturerStatsSchema,
  toggleScanningSchema,
  reportGenerationSchema,
  attendanceFilterSchema,
  atRiskStudentsSchema,
};
