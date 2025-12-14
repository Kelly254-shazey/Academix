/**
 * Socket.IO Real-Time Attendance Handler
 * Manages live QR code display, real-time validation, and WebSocket communications
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const qrTokenService = require('./qrTokenService');
const aiRiskScoringService = require('./aiRiskScoringService');
const db = require('../database');

class RealtimeAttendanceHandler {
  constructor(io) {
    this.io = io;
    this.activeSessions = new Map(); // Track active attendance sessions
    this.lecturerQRIntervals = new Map(); // Track QR refresh intervals
    this.setupEventHandlers();
  }

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User ${socket.id} connected via WebSocket for attendance`);

      // ===== LECTURER EVENTS =====
      socket.on('lecturer:start-attendance', (data) => 
        this.handleStartAttendance(socket, data)
      );
      
      socket.on('lecturer:stop-attendance', (data) =>
        this.handleStopAttendance(socket, data)
      );
      
      socket.on('lecturer:refresh-qr', (data) =>
        this.handleRefreshQR(socket, data)
      );

      // ===== STUDENT EVENTS =====
      socket.on('student:scan-qr', (data) =>
        this.handleStudentScan(socket, data)
      );
      
      socket.on('student:request-location', (data) =>
        this.handleLocationRequest(socket, data)
      );

      socket.on('student:location-update', (data) =>
        this.handleLocationUpdate(socket, data)
      );

      // ===== ADMIN EVENTS =====
      socket.on('admin:monitor-session', (data) =>
        this.handleMonitorSession(socket, data)
      );

      socket.on('disconnect', () => {
        logger.info(`User ${socket.id} disconnected`);
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for user ${socket.id}:`, error);
      });
    });
  }

  /**
   * LECTURER: Start attendance for a class session
   */
  async handleStartAttendance(socket, data) {
    try {
      const { classSessionId } = data;
      const lecturerId = socket.userId;

      // Verify lecturer owns this session
      const [session] = await db.execute(
        `SELECT * FROM class_sessions WHERE id = ? AND lecturer_id = ?`,
        [classSessionId, lecturerId]
      );

      if (!session || session.length === 0) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this session'
        });
      }

      // Generate initial QR token
      const qrData = await qrTokenService.generateQRToken(
        classSessionId,
        lecturerId,
        JSON.stringify({
          latitude: session[0].classroom_lat,
          longitude: session[0].classroom_lng
        })
      );

      // Update session status
      await db.execute(
        `UPDATE class_sessions SET qr_active = TRUE, current_qr_token = ?, status = 'in_progress' WHERE id = ?`,
        [qrData.token, classSessionId]
      );

      // Track active session
      this.activeSessions.set(classSessionId, {
        lecturerId,
        startedAt: new Date(),
        qrRefreshCount: 0,
        scannedStudents: new Set()
      });

      // Start automatic QR refresh every 20 seconds
      const refreshInterval = setInterval(async () => {
        try {
          const newQR = await qrTokenService.refreshQRToken(classSessionId, lecturerId);
          
          // Emit to all students in this class room
          this.io.to(`class:${classSessionId}`).emit('qr:refreshed', {
            token: newQR.token,
            expiresAt: newQR.expiresAt,
            refreshedAt: new Date().toISOString()
          });

          // Track refresh
          const session = this.activeSessions.get(classSessionId);
          if (session) {
            session.qrRefreshCount++;
          }

          logger.info(`QR refreshed for session ${classSessionId}`);
        } catch (error) {
          logger.error(`Error refreshing QR for session ${classSessionId}:`, error);
          clearInterval(refreshInterval);
        }
      }, qrData.refreshInterval);

      this.lecturerQRIntervals.set(classSessionId, refreshInterval);

      // Notify lecturer
      socket.emit('attendance:started', {
        sessionId: classSessionId,
        qr: qrData,
        message: 'Attendance window opened'
      });

      // Broadcast to students (they can now see attendance is open)
      this.io.to(`class:${classSessionId}`).emit('attendance:opened', {
        sessionId: classSessionId,
        qr: qrData
      });

      logger.info(`Attendance started for session ${classSessionId}`, {
        lecturerId,
        qrToken: qrData.token.substring(0, 20) + '...'
      });
    } catch (error) {
      logger.error('Error starting attendance:', error);
      socket.emit('error', {
        code: 'START_FAILED',
        message: 'Failed to start attendance'
      });
    }
  }

  /**
   * LECTURER: Stop attendance for a session
   */
  async handleStopAttendance(socket, data) {
    try {
      const { classSessionId } = data;
      const lecturerId = socket.userId;

      // Stop QR refresh interval
      const refreshInterval = this.lecturerQRIntervals.get(classSessionId);
      if (refreshInterval) {
        clearInterval(refreshInterval);
        this.lecturerQRIntervals.delete(classSessionId);
      }

      // Invalidate current QR
      await qrTokenService.invalidateQRToken(classSessionId, lecturerId);

      // Update session status
      await db.execute(
        `UPDATE class_sessions SET qr_active = FALSE, status = 'closed' WHERE id = ?`,
        [classSessionId]
      );

      // Get attendance summary
      const [summary] = await db.execute(
        `SELECT COUNT(*) as total_scanned, 
                SUM(CASE WHEN risk_score > 60 THEN 1 ELSE 0 END) as flagged
         FROM attendance_scans WHERE class_session_id = ? AND status = 'verified'`,
        [classSessionId]
      );

      const attendanceSummary = summary?.[0] || { total_scanned: 0, flagged: 0 };

      // Remove from active sessions
      this.activeSessions.delete(classSessionId);

      // Notify lecturer and students
      this.io.to(`class:${classSessionId}`).emit('attendance:closed', {
        sessionId: classSessionId,
        summary: attendanceSummary,
        message: 'Attendance window closed'
      });

      socket.emit('attendance:stopped', {
        sessionId: classSessionId,
        summary: attendanceSummary
      });

      logger.info(`Attendance stopped for session ${classSessionId}`, attendanceSummary);
    } catch (error) {
      logger.error('Error stopping attendance:', error);
      socket.emit('error', {
        code: 'STOP_FAILED',
        message: 'Failed to stop attendance'
      });
    }
  }

  /**
   * LECTURER: Manually refresh QR (on demand)
   */
  async handleRefreshQR(socket, data) {
    try {
      const { classSessionId } = data;
      const lecturerId = socket.userId;

      const qrData = await qrTokenService.refreshQRToken(classSessionId, lecturerId);

      socket.emit('qr:manual-refresh', {
        sessionId: classSessionId,
        qr: qrData
      });

      logger.info(`Manual QR refresh for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error manually refreshing QR:', error);
      socket.emit('error', {
        code: 'REFRESH_FAILED',
        message: 'Failed to refresh QR'
      });
    }
  }

  /**
   * STUDENT: Scan QR code
   */
  async handleStudentScan(socket, data) {
    try {
      const { token, classSessionId } = data;
      const studentId = socket.userId;

      logger.info(`QR scan attempt by student ${studentId} for session ${classSessionId}`);

      // Validate QR token (assuming we'll use the validation middleware function separately)
      // For now, emit real-time feedback
      socket.emit('scan:processing', {
        message: 'Processing your attendance...'
      });

      // Emit to lecturer in real-time
      const [session] = await db.execute(
        `SELECT lecturer_id FROM class_sessions WHERE id = ?`,
        [classSessionId]
      );

      if (session && session.length > 0) {
        this.io.to(`lecturer:${session[0].lecturer_id}`).emit('student:scanned', {
          classSessionId,
          studentId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error handling student scan:', error);
      socket.emit('scan:error', {
        message: 'Error processing your scan'
      });
    }
  }

  /**
   * STUDENT: Request location permission
   */
  async handleLocationRequest(socket, data) {
    try {
      const { classSessionId } = data;
      socket.emit('location:requested', {
        sessionId: classSessionId,
        message: 'Please allow location access for attendance verification'
      });

      logger.info(`Location requested for student ${socket.userId}`);
    } catch (error) {
      logger.error('Error requesting location:', error);
    }
  }

  /**
   * STUDENT: Send location update
   */
  async handleLocationUpdate(socket, data) {
    try {
      const { classSessionId, latitude, longitude, accuracy } = data;
      const studentId = socket.userId;

      // Store location for validation
      socket.studentLocation = { latitude, longitude, accuracy };

      logger.info(`Location update from student ${studentId}`, {
        classSessionId,
        accuracy
      });

      socket.emit('location:updated', {
        message: 'Location received'
      });
    } catch (error) {
      logger.error('Error updating location:', error);
    }
  }

  /**
   * ADMIN: Monitor active sessions
   */
  async handleMonitorSession(socket, data) {
    try {
      const { classSessionId } = data;

      // Join admin monitoring room
      socket.join(`admin:monitoring:${classSessionId}`);

      // Send current session data
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      const [attendance] = await db.execute(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN risk_score > 60 THEN 1 ELSE 0 END) as flagged
         FROM attendance_scans WHERE class_session_id = ? AND status = 'verified'`,
        [classSessionId]
      );

      socket.emit('session:monitoring-data', {
        session: session?.[0],
        attendance: attendance?.[0],
        activeSessions: this.activeSessions.size
      });

      logger.info(`Admin ${socket.userId} monitoring session ${classSessionId}`);
    } catch (error) {
      logger.error('Error monitoring session:', error);
      socket.emit('error', {
        message: 'Failed to load monitoring data'
      });
    }
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(socket) {
    // Clean up any rooms the user was in
    socket.rooms.forEach(room => {
      socket.leave(room);
    });

    logger.info(`User ${socket.userId} cleanup complete`);
  }

  /**
   * Broadcast attendance event to lecturer and admin
   */
  broadcastAttendanceEvent(classSessionId, event, data) {
    this.io.to(`class:${classSessionId}`).emit(`attendance:${event}`, data);
  }

  /**
   * Broadcast alert to student
   */
  notifyStudent(studentId, alertType, message, data = {}) {
    this.io.to(`student:${studentId}`).emit(`alert:${alertType}`, {
      message,
      ...data
    });
  }

  /**
   * Broadcast alert to lecturer
   */
  notifyLecturer(lecturerId, alertType, message, data = {}) {
    this.io.to(`lecturer:${lecturerId}`).emit(`alert:${alertType}`, {
      message,
      ...data
    });
  }
}

module.exports = RealtimeAttendanceHandler;
