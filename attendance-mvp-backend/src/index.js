const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { errorHandler } = require('./middleware/auth');

// Initialize Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));

// Make Socket.IO available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

/**
 * Socket.IO Connection Handling
 * Manages real-time connections, room joining, and event broadcasting
 */
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  /**
   * Join user-specific room
   * Each user joins their own room for direct notifications
   */
  socket.on('user:join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined personal room`);
  });

  /**
   * Join class room
   * Users join class-specific rooms to receive class updates
   */
  socket.on('class:join', (classId) => {
    socket.join(`class_${classId}`);
    console.log(`📚 Socket joined class room: class_${classId}`);
  });

  /**
   * Receive real-time attendance update
   * Broadcasts to all users in the class room
   */
  socket.on('attendance:marked', (data) => {
    console.log(`📝 Attendance marked for class ${data.classId}:`, data);
    io.to(`class_${data.classId}`).emit('attendance:updated', data);
  });

  /**
   * Receive class cancellation
   * Broadcasts cancellation to all students in class
   */
  socket.on('class:cancel', (data) => {
    console.log(`❌ Class cancelled: ${data.classId}`);
    io.to(`class_${data.classId}`).emit('class:cancelled', data);
  });

  /**
   * Receive class reschedule
   * Broadcasts new schedule to all students
   */
  socket.on('class:reschedule', (data) => {
    console.log(`📅 Class rescheduled: ${data.classId}`);
    io.to(`class_${data.classId}`).emit('class:rescheduled', data);
  });

  /**
   * Send notification to specific user
   * Used by controllers to send real-time notifications
   */
  socket.on('notification:send', (data) => {
    const { userId, notification } = data;
    console.log(`🔔 Sending notification to user ${userId}`);
    io.to(`user_${userId}`).emit('notification:received', notification);
  });

  /**
   * Leave class room
   */
  socket.on('class:leave', (classId) => {
    socket.leave(`class_${classId}`);
    console.log(`📚 Socket left class room: class_${classId}`);
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });

  /**
   * Error handling
   */
  socket.on('error', (error) => {
    console.error(`⚠️ Socket error for ${socket.id}:`, error);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: '✅ Server is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  🚀 Attendance Management System Started
  ================================
  🌐 Server: http://localhost:${PORT}
  🔌 Socket.IO: Active
  🗄️  Database: PostgreSQL
  📡 CORS: Enabled for ${process.env.CLIENT_URL || 'http://localhost:3000'}
  ================================
  `);
});

module.exports = { app, server, io };
