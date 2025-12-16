/**
 * Socket.IO Client Service
 * Purpose: Real-time communication between frontend and backend
 * Handles: Messages, alerts, attendance updates, QR refreshes
 * 
 * CRITICAL: ALL DATA through Socket.IO originates from database only
 */

import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.userRole = null;
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Socket connection with authentication
   * @param {string} token JWT token from login
   * @param {string} userId User ID
   * @param {string} userRole User role (student/lecturer/admin)
   */
  connect(token, userId, userRole) {
    return new Promise((resolve, reject) => {
      try {
        // Don't create new connection if already connected
        if (this.connected && this.socket) {
          resolve(this.socket);
          return;
        }

        this.userId = userId;
        this.userRole = userRole;

        // Use socket URL or derive from API URL
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';
        const backendUrl = apiUrl.replace(/\/api\/?$/i, '');
        const socketUrl = process.env.REACT_APP_SOCKET_URL || backendUrl;

        this.socket = io(socketUrl, {
          auth: {
            token,
            userId,
            userRole
          },
          reconnection: false, // Disable auto-reconnection to prevent spam
          timeout: 10000,
          forceNew: false
        });

        // Connection established
        this.socket.on('connect', () => {
          console.log('✓ Socket.IO connected:', this.socket.id);
          this.connected = true;
          this.reconnectAttempts = 0;

          // Join user-specific room for direct messages
          this.socket.emit('join-user-room', { userId });
          
          // Join role-based room for broadcasts
          this.socket.emit('join-role-room', { role: userRole });

          // Emit custom event listeners
          this._setupEventListeners();

          resolve(this.socket);
        });

        // Connection failed
        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error.message);
          this.connected = false;
          reject(error);
        });

        // Disconnected
        this.socket.on('disconnect', (reason) => {
          console.warn('⚠️  Socket.IO disconnected:', reason);
          this.connected = false;
          this._triggerEvent('disconnected', { reason });
        });

        // Reconnection attempt
        this.socket.on('reconnect_attempt', () => {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        });

      } catch (error) {
        console.error('❌ Socket initialization error:', error);
        reject(error);
      }
    });
  }

  /**
   * Setup all event listeners for real-time updates
   * CRITICAL: Events from backend ALWAYS contain database-sourced data
   */
  _setupEventListeners() {
    // Admin messages (direct messaging)
    this.socket.on('admin:message', (data) => {
      // Data structure: { messageId, senderId, message, type, priority, timestamp, read }
      // ALL data already in database, frontend just displays
      console.log('📨 Admin message received:', data.message);
      this._triggerEvent('admin:message', data);
    });

    // Role-based broadcasts (announcements to all students/lecturers)
    this.socket.on('broadcast:announcement', (data) => {
      // Data: { messageId, message, sentBy, role, timestamp }
      console.log('📢 Broadcast received for role:', this.userRole);
      this._triggerEvent('broadcast:announcement', data);
    });

    // System alerts (critical system-wide alerts)
    this.socket.on('system:alert', (data) => {
      // Data: { alertId, severity, message, affectedUsers, timestamp }
      console.log('🚨 System alert:', data.message);
      this._triggerEvent('system:alert', data);
    });

    // QR token refresh (lecturer's QR token expired, request new one)
    this.socket.on('qr:refreshed', (data) => {
      // Data: { sessionId, newQRToken, expiresIn, generatedAt }
      // Backend generates - frontend just displays new QR
      console.log('🔄 QR token refreshed for session:', data.sessionId);
      this._triggerEvent('qr:refreshed', data);
    });

    // Student attendance scanned
    this.socket.on('attendance:student-scanned', (data) => {
      // Data: { studentId, studentName, scanTime, status, riskScore }
      // From database attendance_scans table
      console.log('✓ Student scanned:', data.studentName);
      this._triggerEvent('attendance:student-scanned', data);
    });

    // Attendance session opened (lecturer started attendance)
    this.socket.on('attendance:opened', (data) => {
      // Data: { sessionId, lecturerId, className, startTime, endTime }
      // From database class_sessions table
      console.log('✓ Attendance opened:', data.className);
      this._triggerEvent('attendance:opened', data);
    });

    // Attendance session closed (lecturer stopped attendance)
    this.socket.on('attendance:closed', (data) => {
      // Data: { sessionId, totalPresent, totalAbsent, closedAt }
      // From database
      console.log('✓ Attendance closed:', data.totalPresent + ' present');
      this._triggerEvent('attendance:closed', data);
    });

    // Lecturer alert (AI detected suspicious activity)
    this.socket.on('lecturer:alert', (data) => {
      // Data: { alertId, sessionId, studentId, alertType, severity, details }
      // From database attendance_alerts table
      console.log('🚨 Lecturer alert:', data.alertType);
      this._triggerEvent('lecturer:alert', data);
    });

    // Real-time attendance stats update
    this.socket.on('attendance:stats-update', (data) => {
      // Data: { sessionId, totalScanned, totalAbsent, avgRiskScore }
      // Calculated from database
      console.log('📊 Attendance stats updated');
      this._triggerEvent('attendance:stats-update', data);
    });

    // User data changed (profile updated by admin)
    this.socket.on('user:data-changed', (data) => {
      // Data: { userId, changes, updatedAt }
      // From database users table
      console.log('✓ User data changed');
      this._triggerEvent('user:data-changed', data);
    });
  }

  /**
   * Emit event to backend
   * @param {string} event Event name
   * @param {object} data Event data
   * @param {function} callback Optional callback for acknowledgment
   */
  emit(event, data, callback) {
    if (!this.connected) {
      console.error('❌ Socket not connected. Event not sent:', event);
      return false;
    }

    try {
      this.socket.emit(event, data, (response) => {
        if (callback) callback(response);
      });
      return true;
    } catch (error) {
      console.error('❌ Error emitting event:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time events
   * @param {string} event Event name to listen for
   * @param {function} handler Function to handle event
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Unsubscribe from event
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Trigger event for all subscribers
   */
  _triggerEvent(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('❌ Event handler error:', error);
        }
      });
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.userId = null;
      this.userRole = null;
      console.log('✓ Socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get current socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
