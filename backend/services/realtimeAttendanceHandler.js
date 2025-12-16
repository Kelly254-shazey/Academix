/**
 * Real-time Attendance Handler
 * Manages WebSocket connections for attendance tracking
 */

class RealtimeAttendanceHandler {
  constructor(io) {
    this.io = io;
    this.activeConnections = new Map();
    this.setupEventHandlers();
    
    // Make connections globally accessible
    if (!global.activeConnections) {
      global.activeConnections = new Map();
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Mark connection type for tracking
      socket.on('join-attendance-service', () => {
        const connection = global.activeConnections?.get(socket.id);
        if (connection) {
          connection.type = 'attendance';
        }
      });

      // Handle user identification
      socket.on('identify-user', (data) => {
        const { userId, userRole } = data;
        this.activeConnections.set(socket.id, {
          socketId: socket.id,
          connectedAt: new Date(),
          userId,
          userRole
        });
        console.log(`👤 Attendance user identified: ${userId} (${userRole})`);
      });

      // Handle attendance events
      socket.on('attendance-scan', (data) => {
        console.log('📊 Attendance scan received:', data);
        socket.broadcast.emit('attendance-update', data);
      });
    });
  }

  // Broadcast attendance update to all connected clients
  broadcastAttendanceUpdate(data) {
    this.io.emit('attendance-update', data);
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.values())
    };
  }
}

module.exports = RealtimeAttendanceHandler;