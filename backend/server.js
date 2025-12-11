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
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
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
app.use('/dashboard', dashboardRoutes);
app.use('/ai', aiRoutes);
app.use('/notifications', notificationRoutes);
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

  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined notification room`, { socketId: socket.id });
    socket.emit('connection-confirmed', { success: true, userId, socketId: socket.id });
  });

  socket.on('join-course-room', (courseId) => {
    socket.join(`course_${courseId}`);
    logger.info(`Client joined course ${courseId}`, { socketId: socket.id });
  });

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
