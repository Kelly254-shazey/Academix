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

const PORT = process.env.PORT || 5002;

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
