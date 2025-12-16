/**
 * Connection Manager
 * Handles automatic reconnection and connection recovery
 */

import apiClient from './apiClient';
import socketService from './socketService';
import healthCheckService from './healthCheck';

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Network status changes
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      this.isOnline = true;
      this.handleConnectionRestore();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network connection lost');
      this.isOnline = false;
    });

    // Socket connection events
    socketService.on('disconnected', (data) => {
      console.log('🔌 Socket disconnected:', data.reason);
      if (this.isOnline) {
        this.attemptReconnection();
      }
    });
  }

  async handleConnectionRestore() {
    this.reconnectAttempts = 0;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        
        // Restore API client token
        apiClient.setToken(token);
        
        // Reconnect socket
        await socketService.connect(token, userData.id, userData.role);
        
        // Perform health check
        await healthCheckService.performHealthCheck();
        
        console.log('✅ Connection fully restored');
      } catch (error) {
        console.error('❌ Failed to restore connection:', error);
        this.attemptReconnection();
      }
    }
  }

  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.handleConnectionRestore();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  getConnectionStatus() {
    return {
      online: this.isOnline,
      socketConnected: socketService.isConnected(),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

const connectionManager = new ConnectionManager();
export default connectionManager;