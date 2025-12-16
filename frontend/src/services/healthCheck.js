/**
 * Health Check Service
 * Monitors backend and socket connectivity
 */

// eslint-disable-next-line no-unused-vars
import apiClient from './apiClient';
import socketService from './socketService';

class HealthCheckService {
  constructor() {
    this.status = {
      backend: 'unknown',
      socket: 'unknown',
      lastCheck: null
    };
    this.listeners = [];
  }

  /**
   * Check backend health
   */
  async checkBackend() {
    try {
      const data = await apiClient.get('/health');
      this.status.backend = data.status === 'ok' ? 'healthy' : 'degraded';
      return true;
    } catch (error) {
      console.error('Backend health check failed:', error);
      this.status.backend = 'error';
      return false;
    }
  }

  /**
   * Check socket connectivity
   */
  checkSocket() {
    const isConnected = socketService.isConnected();
    this.status.socket = isConnected ? 'healthy' : 'error';
    return isConnected;
  }

  /**
   * Perform full health check
   */
  async performHealthCheck() {
    this.status.lastCheck = new Date().toISOString();
    
    const [backendHealthy, socketHealthy] = await Promise.all([
      this.checkBackend(),
      Promise.resolve(this.checkSocket())
    ]);

    const overallHealth = backendHealthy && socketHealthy ? 'healthy' : 'error';
    
    // Notify listeners
    this.notifyListeners({
      ...this.status,
      overall: overallHealth
    });

    return {
      backend: this.status.backend,
      socket: this.status.socket,
      overall: overallHealth,
      timestamp: this.status.lastCheck
    };
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Health check listener error:', error);
      }
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      ...this.status,
      overall: this.status.backend === 'healthy' && this.status.socket === 'healthy' ? 'healthy' : 'error'
    };
  }

  /**
   * Start periodic health checks
   */
  startMonitoring(interval = 30000) {
    // Initial check
    this.performHealthCheck();
    
    // Periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

const healthCheckService = new HealthCheckService();
export default healthCheckService;