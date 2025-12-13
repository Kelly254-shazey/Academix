const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const attendanceAnalyticsRoutes = require('./routes/attendanceAnalytics');
const dashboardRoutes = require('./routes/dashboard');
const scheduleRoutes = require('./routes/schedule');
const aiRoutes = require('./routes/ai');
const aiInsightsRoutes = require('./routes/aiInsights');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');
const supportRoutes = require('./routes/support');
const gamificationRoutes = require('./routes/gamification');
const calendarRoutes = require('./routes/calendar');
const courseAnalyticsRoutes = require('./routes/courseAnalytics');
const feedbackRoutes = require('./routes/feedback');
const qrRoutes = require('./routes/qr');
const adminRoutes = require('./routes/admin');
// Lecturer Dashboard Routes
const lecturerRoutes = require('./routes/lecturer');
const classControlRoutes = require('./routes/classControl');
const lecturerQRRoutes = require('./routes/lecturerQR');
const rosterRoutes = require('./routes/roster');
// Admin Dashboard Routes
const adminDashboardRoutes = require('./routes/adminDashboard');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io globally accessible for services
global.io = io;

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/classes', classRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/attendance-analytics', attendanceAnalyticsRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ai', aiRoutes);
app.use('/ai-insights', aiInsightsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile', profileRoutes);
app.use('/settings', settingsRoutes);
app.use('/support', supportRoutes);
app.use('/gamification', gamificationRoutes);
app.use('/calendar', calendarRoutes);
app.use('/course-analytics', courseAnalyticsRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/qr', qrRoutes);
app.use('/admin', adminRoutes);

// Lecturer Dashboard Routes
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/classes', classControlRoutes);
app.use('/api/classes', lecturerQRRoutes);
app.use('/api/classes', rosterRoutes);

// Admin Dashboard Routes
app.use('/api/admin', adminDashboardRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ClassTrack AI Backend is running', status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);

  // Join user-specific notification room
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined notification room`, { socketId: socket.id });
    socket.emit('connection-confirmed', { success: true, userId, socketId: socket.id });
  });

  // Join course-specific room
  socket.on('join-course-room', (courseId) => {
    socket.join(`course_${courseId}`);
    logger.info(`Client joined course ${courseId}`, { socketId: socket.id });
  });

  // Join class-specific room (for lecturer session updates)
  socket.on('join-class-room', (classId) => {
    socket.join(`class_${classId}`);
    logger.info(`Client joined class ${classId}`, { socketId: socket.id });
  });

  // Join session-specific room
  socket.on('join-session-room', (sessionId) => {
    socket.join(`session_${sessionId}`);
    logger.info(`Client joined session ${sessionId}`, { socketId: socket.id });
  });

  // Class events
  socket.on('class-started', (data) => {
    const { classId, courseName } = data;
    io.to(`course_${classId}`).emit('class-started', {
      classId,
      courseName,
      message: `${courseName} has started. Please check in.`,
      timestamp: new Date(),
    });
    logger.info(`Class started notification for course ${classId}`);
  });

  socket.on('class-cancelled', (data) => {
    const { classId, courseName, reason } = data;
    io.to(`course_${classId}`).emit('class-cancelled', {
      classId,
      courseName,
      reason,
      message: `${courseName} has been cancelled.${reason ? ' Reason: ' + reason : ''}`,
      timestamp: new Date(),
    });
    logger.info(`Class cancellation notification for course ${classId}`);
  });

  socket.on('room-changed', (data) => {
    const { classId, courseName, newLocation } = data;
    io.to(`course_${classId}`).emit('room-changed', {
      classId,
      courseName,
      newLocation,
      message: `${courseName} location changed to ${newLocation}.`,
      timestamp: new Date(),
    });
    logger.info(`Room change notification for course ${classId}`);
  });

  socket.on('lecturer-delay', (data) => {
    const { classId, courseName, delayMinutes } = data;
    io.to(`course_${classId}`).emit('lecturer-delay', {
      classId,
      courseName,
      delayMinutes,
      message: `${courseName} lecturer will be ${delayMinutes} minutes late.`,
      timestamp: new Date(),
    });
    logger.info(`Lecturer delay notification for course ${classId}`);
  });

  // Lecturer Dashboard Session Events
  socket.on('lecturer-session-started', (data) => {
    const { classId, sessionId, lecturerId } = data;
    io.to(`class_${classId}`).emit('lecturer-session-started', {
      classId,
      sessionId,
      lecturerId,
      message: 'Lecturer has started the session',
      timestamp: new Date(),
    });
    logger.info(`Session ${sessionId} started by lecturer ${lecturerId}`);
  });

  socket.on('lecturer-session-delayed', (data) => {
    const { classId, sessionId, delayMinutes, newStartTime } = data;
    io.to(`class_${classId}`).emit('lecturer-session-delayed', {
      classId,
      sessionId,
      delayMinutes,
      newStartTime,
      message: `Session delayed by ${delayMinutes} minutes`,
      timestamp: new Date(),
    });
    logger.info(`Session ${sessionId} delayed by ${delayMinutes} minutes`);
  });

  socket.on('lecturer-session-cancelled', (data) => {
    const { classId, sessionId, reason } = data;
    io.to(`class_${classId}`).emit('lecturer-session-cancelled', {
      classId,
      sessionId,
      reason,
      message: 'Session has been cancelled',
      timestamp: new Date(),
    });
    logger.info(`Session ${sessionId} cancelled: ${reason}`);
  });

  socket.on('lecturer-qr-rotated', (data) => {
    const { classId, sessionId } = data;
    io.to(`session_${sessionId}`).emit('lecturer-qr-rotated', {
      classId,
      sessionId,
      message: 'QR code has been rotated',
      timestamp: new Date(),
    });
    logger.info(`QR rotated for session ${sessionId}`);
  });

  socket.on('lecturer-attendance-verified', (data) => {
    const { classId, sessionId, studentId, status } = data;
    io.to(`session_${sessionId}`).emit('lecturer-attendance-verified', {
      classId,
      sessionId,
      studentId,
      status,
      message: `Student ${studentId} attendance verified as ${status}`,
      timestamp: new Date(),
    });
    logger.info(`Attendance verified for student ${studentId}`);
  });

  socket.on('lecturer-roster-updated', (data) => {
    const { classId, sessionId, totalStudents, presentCount } = data;
    io.to(`session_${sessionId}`).emit('lecturer-roster-updated', {
      classId,
      sessionId,
      totalStudents,
      presentCount,
      message: `Roster updated: ${presentCount}/${totalStudents} present`,
      timestamp: new Date(),
    });
    logger.info(`Roster updated for session ${sessionId}`);
  });

  socket.on('lecturer-alert-created', (data) => {
    const { lecturerId, alertType, severity, message } = data;
    io.to(`user_${lecturerId}`).emit('lecturer-alert-created', {
      lecturerId,
      alertType,
      severity,
      message,
      timestamp: new Date(),
    });
    logger.info(`Alert created for lecturer ${lecturerId}`);
  });

  // Admin Dashboard Events
  socket.on('admin-join-dashboard', (data) => {
    const { adminId } = data;
    socket.join(`admin_${adminId}`);
    socket.join('admin-dashboard');
    logger.info(`Admin ${adminId} joined dashboard`, { socketId: socket.id });
  });

  socket.on('broadcast-notification', (data) => {
    const { broadcastId, targetType, message, priority } = data;
    if (targetType === 'all') {
      io.emit('new-broadcast', {
        broadcastId,
        message,
        priority,
        timestamp: new Date(),
      });
    } else {
      io.to('admin-dashboard').emit('new-broadcast', {
        broadcastId,
        message,
        priority,
        timestamp: new Date(),
      });
    }
    logger.info(`Broadcast ${broadcastId} sent with priority ${priority}`);
  });

  socket.on('admin-action-logged', (data) => {
    const { action, resourceType, severity } = data;
    io.to('admin-dashboard').emit('audit-update', {
      action,
      resourceType,
      severity,
      timestamp: new Date(),
    });
    logger.info(`Admin action logged: ${action} on ${resourceType}`);
  });

  socket.on('department-updated', (data) => {
    const { departmentId, departmentName } = data;
    io.to('admin-dashboard').emit('department-updated', {
      departmentId,
      departmentName,
      message: `Department ${departmentName} updated`,
      timestamp: new Date(),
    });
    logger.info(`Department ${departmentId} updated notification`);
  });

  socket.on('student-flagged', (data) => {
    const { studentId, studentName, flagType, severity } = data;
    io.to('admin-dashboard').emit('student-flagged', {
      studentId,
      studentName,
      flagType,
      severity,
      message: `Student ${studentName} flagged as ${flagType}`,
      timestamp: new Date(),
    });
    logger.info(`Student ${studentId} flagged as ${flagType} (${severity})`);
  });

  socket.on('export-job-started', (data) => {
    const { jobId, exportType, format } = data;
    io.to('admin-dashboard').emit('export-job-progress', {
      jobId,
      status: 'started',
      exportType,
      format,
      progress: 0,
      timestamp: new Date(),
    });
    logger.info(`Export job ${jobId} started (${exportType} as ${format})`);
  });

  socket.on('export-job-completed', (data) => {
    const { jobId, exportType, format, fileSize } = data;
    io.to('admin-dashboard').emit('export-job-progress', {
      jobId,
      status: 'completed',
      exportType,
      format,
      progress: 100,
      fileSize,
      timestamp: new Date(),
    });
    logger.info(`Export job ${jobId} completed`);
  });

  socket.on('system-alert', (data) => {
    const { alertType, severity, message } = data;
    io.to('admin-dashboard').emit('system-alert', {
      alertType,
      severity,
      message,
      timestamp: new Date(),
    });
    logger.info(`System alert: ${alertType} (${severity})`);
  });

  // Generic notification
  socket.on('send-notification', (data) => {
    logger.info('Notification event', data);
    io.emit('notification-update', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling and 404
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV });
});

module.exports = server;
