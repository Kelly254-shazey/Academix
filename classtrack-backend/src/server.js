/**
 * Main Express Server
 * ClassTrack AI Backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const db = require('./config/database');
const redis = require('./config/redis');
const { authenticateToken, verifyRole } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ClassTrack AI Backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', verifyRole(['admin']), adminRoutes);
app.use('/api/ai', aiRoutes);

// WebSocket events (real-time updates)
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join session room for real-time class monitoring
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`Client joined session: ${sessionId}`);
  });

  // Broadcast attendance updates
  socket.on('attendance-updated', (data) => {
    io.to(`session-${data.sessionId}`).emit('attendance-update', data);
  });

  // Real-time notifications
  socket.on('send-notification', (notification) => {
    io.emit('notification', notification);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Test Redis connection
    redis.ping().catch(() => console.warn('⚠️  Redis connection optional'));

    console.log(`🚀 ClassTrack AI Backend running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await db.end();
    redis.disconnect();
    process.exit(0);
  });
});

module.exports = { app, server, io };
