/**
 * Real-time Communication Service
 * Handles admin messaging and notifications
 */

class RealTimeCommunicationService {
  constructor(io) {
    this.io = io;
    this.adminConnections = new Set();
    this.userConnections = new Map();
    this.setupEventHandlers();
    
    // Ensure global connection tracking exists
    if (!global.activeConnections) {
      global.activeConnections = new Map();
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Mark connection type for tracking
      socket.on('join-communication-service', () => {
        const connection = global.activeConnections?.get(socket.id);
        if (connection) {
          connection.type = 'communication';
        }
      });

      // Handle admin connections
      socket.on('admin-connect', (data) => {
        this.adminConnections.add(socket.id);
        socket.join('admin-room');
        console.log(`👨‍💼 Admin connected: ${socket.id}`);
        
        const connection = global.activeConnections?.get(socket.id);
        if (connection) {
          connection.type = 'admin';
          connection.userId = data.adminId;
        }
      });

      // Handle user connections
      socket.on('user-connect', (data) => {
        const { userId } = data;
        this.userConnections.set(socket.id, userId);
        socket.join(`user-${userId}`);
        console.log(`👤 Communication user connected: ${userId}`);
        
        const connection = global.activeConnections?.get(socket.id);
        if (connection) {
          connection.type = 'communication';
          connection.userId = userId;
        }
      });

      // Cleanup handled in main server.js disconnect handler
    });
  }

  // Send message to specific user
  sendMessageToUser(userId, message) {
    this.io.to(`user-${userId}`).emit('new-message', message);
  }

  // Send broadcast to all admins
  sendAdminBroadcast(message) {
    this.io.to('admin-room').emit('admin-broadcast', message);
  }

  // Send system notification
  sendSystemNotification(notification) {
    this.io.emit('system-notification', notification);
  }

  // Get service statistics
  getStats() {
    return {
      adminConnections: this.adminConnections.size,
      userConnections: this.userConnections.size,
      totalConnections: this.adminConnections.size + this.userConnections.size
    };
  }
}

module.exports = RealTimeCommunicationService;