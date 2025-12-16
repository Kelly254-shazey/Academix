/**
 * Quick Start Script
 * Minimal backend server for testing
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 5002;

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'healthy' },
      socket: { status: 'healthy', connections: io.sockets.sockets.size }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ClassTrack AI Backend is running',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Basic auth endpoint
app.get('/api/auth/verify', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'No token provided'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  socket.emit('connection-confirmed', {
    success: true,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Quick Start Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

module.exports = server;