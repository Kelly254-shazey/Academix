const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const db = require('./database');
const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler, securityHeaders, requestTimeout } = require('./middlewares/errorMiddleware');

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
const reportsRoutes = require('./routes/reportsRoutes');
// Lecturer Dashboard Routes
const lecturerRoutes = require('./routes/lecturer');
const classControlRoutes = require('./routes/classControl');
const lecturerQRRoutes = require('./routes/lecturerQR');
const rosterRoutes = require('./routes/roster');
const sessionsRoutes = require('./routes/sessions');
// Admin Dashboard Routes
const adminDashboardRoutes = require('./routes/adminDashboard');
// Student Portal Routes
const studentRoutes = require('./routes/student');
// Health check route
const healthRoutes = require('./routes/health');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Make io globally accessible for services
global.io = io;

// Initialize real-time attendance handler
const RealtimeAttendanceHandler = require('./services/realtimeAttendanceHandler');
new RealtimeAttendanceHandler(io);

// Initialize real-time communication service (admin notifications)
const RealTimeCommunicationService = require('./services/realtimeCommunicationService');
global.communicationService = new RealTimeCommunicationService(io);

const PORT = process.env.PORT || 5003;

// Security middleware
app.use(securityHeaders);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Request timeout
app.use(requestTimeout(30000));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX) : 50,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  }
});

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ].filter(Boolean);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware (MUST BE BEFORE RATE LIMITING)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting AFTER body parsing (disabled in development)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authLimiter);
  app.use(limiter);
}

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes - Consolidated & Non-Duplicated
// ============================================
// Core Authentication - Direct routes to fix 404
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const [users] = await db.execute('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute('INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)', [name, email.toLowerCase(), hashedPassword, 'student', 'General']);
    const token = jwt.sign({ id: result.insertId, email: email.toLowerCase(), role: 'student' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    res.status(201).json({ success: true, token, user: { id: result.insertId, name, email: email.toLowerCase(), role: 'student', department: 'General' } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// app.use('/api/auth', require('./routes/auth-simple'));

// Student Portal
app.use('/api/student', studentRoutes);
app.use('/api/student', require('./routes/student-performance'));
app.use('/api/dashboard', dashboardRoutes); // Contains student/lecturer/admin dashboards

// Attendance & Analytics
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance', require('./routes/attendance')); // Session management
app.use('/api/attendance', require('./routes/attendanceAPI')); // AI-powered attendance (merged with attendanceRoutes)
app.use('/api/attendance-analytics', attendanceAnalyticsRoutes);

// Classes & Sessions (NO DUPLICATES)
app.use('/api/classes', classRoutes);
app.use('/api/classes', classControlRoutes);
app.use('/api/classes', lecturerQRRoutes);
app.use('/api/classes', rosterRoutes);
// app.use('/api/sessions', sessionsRoutes); // REMOVED - Consolidated into /api/classes

// Schedule
app.use('/api/schedule', scheduleRoutes);

// Authentication middleware
const { authenticateToken, requireRole } = require('./middlewares/authMiddleware');
const { requireRole: rbacRequireRole } = require('./middlewares/rbacMiddleware');

// Lecturer Portal (protected routes)
app.use('/api/lecturer', authenticateToken);
app.use('/api/lecturer', rbacRequireRole(['lecturer', 'admin']));
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/lecturer', require('./routes/lecturerDashboard'));
app.use('/api/lecturer', require('./routes/lecturerProfile'));
app.use('/api/lecturer', require('./routes/lecturerSupport'));
app.use('/api/lecturer', require('./routes/lecturerResources'));

// Student Portal (protected routes)
app.use('/api/student', authenticateToken);
app.use('/api/student', rbacRequireRole(['student', 'admin']));
app.use('/api/student', require('./routes/studentResources'));

// Notifications (protected)
app.use('/api/notifications', authenticateToken);
app.use('/api/notifications', require('./routes/notifications'));

// AI Features
app.use('/api/ai', aiRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// User Management
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/support', supportRoutes);

// Admin Portal (NO DUPLICATES)
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin', require('./routes/adminDashboard')); // Admin dashboard
app.use('/api/admin', require('./routes/adminCommunication')); // Admin messaging & real-time

// Complaints system
app.use('/api/complaints', require('./routes/complaintsRoutes'));

// Reports & Analytics
app.use('/api/reports', reportsRoutes);
app.use('/api/course-analytics', courseAnalyticsRoutes);

// Engagement Features
app.use('/api/gamification', gamificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/qr', qrRoutes);

// Health routes
app.use('/api/health', healthRoutes);
app.get('/', (req, res) => {
  res.json({
    message: 'ClassTrack AI Backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Global connection tracking
global.activeConnections = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Track connection globally
  global.activeConnections.set(socket.id, {
    connectedAt: new Date().toISOString(),
    userId: null,
    type: 'unknown'
  });
  
  // Only log in debug mode
  if (process.env.NODE_ENV === 'development') {
    console.log(`📡 Client connected: ${socket.id}`);
  }

  // Join user-specific notification room
  socket.on('join-user-room', (userIdOrObj) => {
    const userId = (userIdOrObj && userIdOrObj.userId) ? userIdOrObj.userId : userIdOrObj;
    socket.join(`user_${userId}`);
    
    // Update connection tracking
    const connection = global.activeConnections.get(socket.id);
    if (connection) {
      connection.userId = userId;
      connection.type = 'user';
    }
    
    logger.info(`👤 User ${userId} joined notification room`, { socketId: socket.id });
    socket.emit('connection-confirmed', { success: true, userId, socketId: socket.id });
  });

  // Join course-specific room
  socket.on('join-course-room', (courseIdOrObj) => {
    const courseId = (courseIdOrObj && courseIdOrObj.courseId) ? courseIdOrObj.courseId : courseIdOrObj;
    socket.join(`course_${courseId}`);
    logger.info(`Client joined course ${courseId}`, { socketId: socket.id });
  });

  // Join class-specific room (for lecturer session updates)
  socket.on('join-class-room', (classIdOrObj) => {
    const classId = (classIdOrObj && classIdOrObj.classId) ? classIdOrObj.classId : classIdOrObj;
    socket.join(`class_${classId}`);
    logger.info(`Client joined class ${classId}`, { socketId: socket.id });
  });

  // Join session-specific room
  socket.on('join-session-room', (sessionIdOrObj) => {
    const sessionId = (sessionIdOrObj && sessionIdOrObj.sessionId) ? sessionIdOrObj.sessionId : sessionIdOrObj;
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

  socket.on('disconnect', (reason) => {
    const connection = global.activeConnections.get(socket.id);
    if (connection) {
      const { userId, type } = connection;
      
      // Clean up service-specific connections
      if (global.communicationService) {
        global.communicationService.adminConnections.delete(socket.id);
        global.communicationService.userConnections.delete(socket.id);
      }
      
      // Only log important disconnections, not transport close
      if (reason !== 'transport close' && reason !== 'client namespace disconnect') {
        if (userId) {
          logger.info(`👤 User ${userId} disconnected: ${reason}`);
        }
      }
      
      global.activeConnections.delete(socket.id);
    }
  });
});

// Error handling and 404
app.use(notFoundHandler);
app.use(errorHandler);

// Catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
});

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV });
  console.log(`✅ Server listening on port ${PORT}`);
  
  // Test database connection on startup
  console.log('🔍 Testing database connection...');
  await testConnection();
});

module.exports = server;
