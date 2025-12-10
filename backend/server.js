const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database');  // Import database connection
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
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io accessible to routes
global.io = io;

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
  res.json({ message: 'ClassTrack AI Backend is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ New client connected: ${socket.id}`);

  // User joins their notification room
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their notification room (Socket: ${socket.id})`);
    
    // Emit connection confirmation
    socket.emit('connection-confirmed', {
      success: true,
      userId,
      socketId: socket.id,
      message: 'Connected to real-time notifications'
    });
  });

  // Student joins course notification room
  socket.on('join-course-room', (courseId) => {
    socket.join(`course_${courseId}`);
    console.log(`📚 Client joined course ${courseId} room (Socket: ${socket.id})`);
  });

  // Listen for notifications
  socket.on('send-notification', (data) => {
    console.log('📬 Notification event received:', data);
    io.emit('notification-update', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
