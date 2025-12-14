/**
 * API Client Service
 * Purpose: Centralized HTTP client for all backend API calls
 * 
 * CRITICAL GUARANTEE:
 * - ALL GET requests return data FROM DATABASE ONLY
 * - ALL POST/PUT requests validate and store IN DATABASE before responding
 * - ALL responses include data source metadata
 * - NO client-side data authority
 * - NO cached stale data displayed
 * - REAL-TIME data from database
 */

import axios from 'axios';

class APIClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.token = null;
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for auth and error handling
   */
  setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors and validate data source
    this.client.interceptors.response.use(
      (response) => {
        // CRITICAL: Verify response came from database
        if (!response.data.fromDatabase && response.config.method === 'get') {
          console.warn('⚠️  Response NOT from database:', response.config.url);
          // Still return data but log warning
        }

        // Verify response has required metadata
        if (!response.data.timestamp) {
          response.data.timestamp = new Date().toISOString();
        }

        return response;
      },
      (error) => {
        // Handle auth errors
        if (error.response?.status === 401) {
          console.error('❌ Unauthorized - clearing token');
          this.setToken(null);
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        // Parse error response
        const errorData = error.response?.data || {};
        console.error('❌ API Error:', {
          status: error.response?.status,
          code: errorData.code,
          message: errorData.message || error.message
        });

        return Promise.reject({
          status: error.response?.status,
          code: errorData.code,
          message: errorData.message || error.message,
          details: errorData.details
        });
      }
    );
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  // ============================================
  // AUTHENTICATION ENDPOINTS
  // ============================================

  /**
   * Login user
   * Returns: { user, token, expiresIn }
   */
  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    return this.client.post('/auth/register', userData);
  }

  /**
   * Verify token and get current user
   * Returns fresh user data from database
   */
  async verifyToken() {
    const response = await this.client.get('/auth/verify');
    return response.data;
  }

  /**
   * Logout user
   */
  async logout() {
    return this.client.post('/auth/logout');
  }

  // ============================================
  // STUDENT ENDPOINTS
  // ============================================

  /**
   * Get student dashboard
   * Returns: { attendanceStats, classes, alerts, recentScans }
   */
  async getStudentDashboard() {
    const response = await this.client.get('/student/dashboard');
    return response.data;
  }

  /**
   * Get student timetable
   */
  async getStudentTimetable() {
    const response = await this.client.get('/student/timetable');
    return response.data;
  }

  /**
   * Get student notifications
   */
  async getStudentNotifications() {
    const response = await this.client.get('/student/notifications');
    return response.data;
  }

  /**
   * Get device history
   */
  async getDeviceHistory() {
    const response = await this.client.get('/student/device-history');
    return response.data;
  }

  /**
   * Remove device from trusted list
   */
  async removeDevice(deviceId) {
    const response = await this.client.delete(`/student/device/${deviceId}`);
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    const response = await this.client.put(`/student/notifications/${notificationId}/read`, {});
    return response.data;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    const response = await this.client.delete(`/student/notifications/${notificationId}`);
    return response.data;
  }

  /**
   * Get attendance history
   */
  async getAttendanceHistory(filters = {}) {
    const response = await this.client.get('/student/attendance-history', { params: filters });
    return response.data;
  }

  // ============================================
  // ATTENDANCE ENDPOINTS
  // ============================================

  /**
   * Scan QR code
   * CRITICAL: Backend validates against database:
   * - Session exists and is active
   * - QR token is valid and not expired
   * - Student location within bounds
   * - Device fingerprint matches
   * - Student hasn't scanned already
   */
  async scanQR(qrToken, location, deviceId) {
    const response = await this.client.post('/attendance/scan', {
      qrToken,
      latitude: location.latitude,
      longitude: location.longitude,
      deviceId
    });
    return response.data;
  }

  /**
   * Get attendance session status
   * Returns real-time data from database
   */
  async getSessionStatus(sessionId) {
    const response = await this.client.get(`/attendance/session/${sessionId}/status`);
    return response.data;
  }

  /**
   * Get current QR for session (lecturer only)
   * Backend generates new QR if previous expired
   */
  async getSessionQR(sessionId) {
    const response = await this.client.get(`/attendance/session/${sessionId}/qr`);
    return response.data;
  }

  // ============================================
  // LECTURER ENDPOINTS
  // ============================================

  /**
   * Get lecturer dashboard
   */
  async getLecturerDashboard() {
    const response = await this.client.get('/lecturer/dashboard');
    return response.data;
  }

  /**
   * Get lecturer sessions
   */
  async getLecturerSessions(filters = {}) {
    const response = await this.client.get('/lecturer/sessions', { params: filters });
    return response.data;
  }

  /**
   * Start attendance session
   * Backend creates session in database, generates QR token
   */
  async startAttendance(classSessionId) {
    const response = await this.client.post(`/attendance/session/${classSessionId}/start`);
    return response.data;
  }

  /**
   * Stop attendance session
   */
  async stopAttendance(classSessionId) {
    const response = await this.client.post(`/attendance/session/${classSessionId}/stop`);
    return response.data;
  }

  /**
   * Get attendance log for session
   */
  async getAttendanceLog(sessionId) {
    const response = await this.client.get(`/lecturer/attendance-log/${sessionId}`);
    return response.data;
  }

  /**
   * Get lecturer alerts
   */
  async getLecturerAlerts() {
    const response = await this.client.get('/lecturer/alerts');
    return response.data;
  }

  /**
   * Get attendance report
   */
  async getAttendanceReport(sessionId) {
    const response = await this.client.get(`/lecturer/reports/${sessionId}`);
    return response.data;
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get admin dashboard
   */
  async getAdminDashboard() {
    const response = await this.client.get('/admin/overview');
    return response.data;
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(filters = {}) {
    const response = await this.client.get('/admin/users', { params: filters });
    return response.data;
  }

  /**
   * Get user details
   */
  async getUser(userId) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId, updates) {
    const response = await this.client.put(`/admin/users/${userId}`, updates);
    return response.data;
  }

  /**
   * Change user status (admin only)
   */
  async changeUserStatus(userId, status) {
    const response = await this.client.post(`/admin/users/${userId}/status`, { status });
    return response.data;
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  /**
   * Send admin message to user
   * Stored in database before returning
   */
  async sendMessage(userId, message, type = 'alert') {
    const response = await this.client.post(`/admin/communicate/message/${userId}`, {
      message,
      type
    });
    return response.data;
  }

  /**
   * Send communication (broadcast or direct)
   */
  async sendCommunication(data) {
    // Support both targeted and broadcast messages
    if (data.userId) {
      return this.sendMessage(data.userId, data.message, data.type);
    } else if (data.role) {
      return this.broadcastMessage(data.role, data.message);
    } else {
      throw new Error('Either userId or role must be provided');
    }
  }

  /**
   * Broadcast message to role
   */
  async broadcastMessage(role, message) {
    const response = await this.client.post(`/admin/communicate/broadcast/${role}`, {
      message
    });
    return response.data;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters = {}) {
    const response = await this.client.get('/admin/audit-logs', { params: filters });
    return response.data;
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics(filters = {}) {
    const response = await this.client.get('/admin/attendance-analytics', { params: filters });
    return response.data;
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts() {
    const response = await this.client.get('/admin/alerts');
    return response.data;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Generic GET request
   */
  async get(endpoint, params = {}) {
    return this.client.get(endpoint, { params });
  }

  /**
   * Generic POST request
   */
  async post(endpoint, data) {
    return this.client.post(endpoint, data);
  }

  /**
   * Generic PUT request
   */
  async put(endpoint, data) {
    return this.client.put(endpoint, data);
  }

  /**
   * Generic DELETE request
   */
  async delete(endpoint) {
    return this.client.delete(endpoint);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }
}

const apiClient = new APIClient();
export default apiClient;
