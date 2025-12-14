/**
 * Admin Portal - Enhanced
 * Features: Error boundaries, toasts, refresh, search, filtering, export, validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import apiClient from '../services/apiClient';
import ErrorBoundary from '../components/ErrorBoundary';
import Toast, { useToast, ToastContainer } from '../components/Toast';
import {
  validateEmail,
  validateSearch,
  sanitizeInput
} from '../utils/validation';
import {
  exportToCSV,
  exportToJSON,
  printData
} from '../utils/exportHelpers';

const AdminPortal = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        addToast('Initializing admin portal...', 'info');

        // Connect to Socket.IO
        await socketService.connect(token, user.id, 'admin');

        // Fetch all data
        const [dashboardData, usersData, logsData, analyticsData] = await Promise.all([
          apiClient.getAdminDashboard(),
          apiClient.getAllUsers(),
          apiClient.getAuditLogs({ limit: 100 }),
          apiClient.getAttendanceAnalytics()
        ]);

        setDashboard(dashboardData);
        setUsers(usersData.data || []);
        setAuditLogs(logsData.data || []);
        setAnalytics(analyticsData);

        setupRealTimeListeners();
        addToast('✓ Admin portal ready', 'success');
        setError(null);
      } catch (err) {
        console.error('Error initializing:', err);
        const errorMsg = err.message || 'Failed to initialize';
        setError(errorMsg);
        addToast('Error: ' + errorMsg, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => socketService.disconnect();
  }, [user.id, token, addToast]);

  // Auto-refresh data
  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'dashboard') {
      interval = setInterval(() => {
        refreshDashboard();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  const setupRealTimeListeners = useCallback(() => {
    socketService.on('user:created', (data) => {
      setUsers(prev => [data, ...prev]);
      addToast(`✓ New user: ${data.name}`, 'success');
    });

    socketService.on('audit:logged', (data) => {
      setAuditLogs(prev => [data, ...prev]);
    });

    socketService.on('admin:alert', (data) => {
      addToast(data.message, 'warning');
    });
  }, [addToast]);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const [dashboardData, usersData, logsData, analyticsData] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getAllUsers(),
        apiClient.getAuditLogs({ limit: 100 }),
        apiClient.getAttendanceAnalytics()
      ]);

      setDashboard(dashboardData);
      setUsers(usersData.data || []);
      setAuditLogs(logsData.data || []);
      setAnalytics(analyticsData);
      addToast('✓ Refreshed', 'success');
    } catch (err) {
      addToast('Error refreshing: ' + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [addToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">👨‍💼 Admin Portal</h1>
                <p className="text-gray-600">Welcome, {user.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => refreshDashboard()}
                  disabled={refreshing}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                >
                  {refreshing ? '⟳ ...' : '🔄 Refresh'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs - Sticky */}
        <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex space-x-4 overflow-x-auto" role="tablist">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'users', label: '👥 Users' },
                { id: 'communications', label: '💬 Communications' },
                { id: 'audit', label: '📋 Audit Logs' },
                { id: 'analytics', label: '📈 Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Reload
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {activeTab === 'dashboard' && 
            <DashboardTab 
              data={dashboard}
              onRefresh={refreshDashboard}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
            />
          }
          {activeTab === 'users' && 
            <UsersTab 
              users={users}
              onUpdate={setUsers}
              addToast={addToast}
            />
          }
          {activeTab === 'communications' && 
            <CommunicationsTab 
              addToast={addToast}
            />
          }
          {activeTab === 'audit' && 
            <AuditLogsTab 
              logs={auditLogs}
              addToast={addToast}
            />
          }
          {activeTab === 'analytics' && 
            <AnalyticsTab 
              data={analytics}
              addToast={addToast}
            />
          }
        </main>

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
};

/**
 * Dashboard Tab - System metrics
 */
const DashboardTab = ({ data, onRefresh, autoRefresh, onAutoRefreshChange }) => {
  if (!data) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          🔄 Refresh Now
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-700">Auto-refresh every 5s</span>
        </label>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-blue-600 text-sm font-medium">Total Users</h3>
          <p className="text-4xl font-bold text-blue-900 mt-2">{data.totalUsers || 0}</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-green-600 text-sm font-medium">Students</h3>
          <p className="text-4xl font-bold text-green-900 mt-2">{data.studentCount || 0}</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-purple-600 text-sm font-medium">Lecturers</h3>
          <p className="text-4xl font-bold text-purple-900 mt-2">{data.lecturerCount || 0}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <h3 className="text-yellow-600 text-sm font-medium">Active Sessions</h3>
          <p className="text-4xl font-bold text-yellow-900 mt-2">{data.activeSessions || 0}</p>
        </div>
      </div>

      {/* System Health */}
      {data.systemHealth && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4">System Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Database</p>
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className="bg-green-500 h-4 rounded"
                  style={{ width: data.systemHealth.database + '%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{data.systemHealth.database}% healthy</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Server</p>
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className="bg-blue-500 h-4 rounded"
                  style={{ width: data.systemHealth.server + '%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{data.systemHealth.server}% healthy</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">API</p>
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className="bg-purple-500 h-4 rounded"
                  style={{ width: data.systemHealth.api + '%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{data.systemHealth.api}% healthy</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Users Tab - User management with search and filter
 */
const UsersTab = ({ users = [], onUpdate, addToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.active : !u.active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExport = () => {
    const data = filtered.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.active ? 'Active' : 'Inactive',
      createdAt: new Date(u.createdAt).toLocaleDateString()
    }));
    exportToCSV(data, 'users.csv');
    addToast('✓ Exported users', 'success');
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await apiClient.deleteUser(userId);
      onUpdate(users.filter(u => u.id !== userId));
      addToast('✓ User deleted', 'success');
    } catch (err) {
      addToast('Error deleting user', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
          className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        />

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="lecturer">Lecturers</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Export
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Showing {filtered.length} of {users.length} users
      </p>
    </div>
  );
};

/**
 * Communications Tab - Send messages and alerts
 */
const CommunicationsTab = ({ addToast }) => {
  const [messageType, setMessageType] = useState('broadcast');
  const [recipientRole, setRecipientRole] = useState('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      addToast('Please fill all fields', 'error');
      return;
    }

    try {
      setSending(true);
      await apiClient.sendCommunication({
        type: messageType,
        role: recipientRole,
        subject,
        message
      });

      setSubject('');
      setMessage('');
      addToast('✓ Message sent', 'success');
    } catch (err) {
      addToast('Error sending message: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">💬 Send Communication</h2>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          >
            <option value="broadcast">Broadcast</option>
            <option value="alert">Alert</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
          <select
            value={recipientRole}
            onChange={(e) => setRecipientRole(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          >
            <option value="all">All Users</option>
            <option value="student">All Students</option>
            <option value="lecturer">All Lecturers</option>
            <option value="admin">All Admins</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(sanitizeInput(e.target.value))}
            maxLength={100}
            placeholder="Message subject"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
          <p className="text-xs text-gray-500 mt-1">{subject.length}/100 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(sanitizeInput(e.target.value))}
            maxLength={500}
            rows="6"
            placeholder="Message content"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
        >
          {sending ? '📤 Sending...' : '📤 Send Message'}
        </button>
      </form>
    </div>
  );
};

/**
 * Audit Logs Tab - View audit trail
 */
const AuditLogsTab = ({ logs = [], addToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const actions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    const matchesSearch = l.userId.includes(searchQuery) || l.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'all' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const handleExport = () => {
    const data = filtered.map(l => ({
      action: l.action,
      user: l.userId,
      timestamp: new Date(l.timestamp).toLocaleString(),
      description: l.description
    }));
    exportToJSON(data, 'audit-logs.json');
    addToast('✓ Exported logs', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
          className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        />

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        >
          <option value="all">All Actions</option>
          {actions.map(action => (
            <option key={action} value={action}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Export
        </button>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((log, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{log.action}</p>
                  <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    User: {log.userId} | {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs whitespace-nowrap ml-2">
                  {log.action}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            <p>No audit logs found</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Analytics Tab - Attendance analytics
 */
const AnalyticsTab = ({ data, addToast }) => {
  const [reportType, setReportType] = useState('all');

  const handleExport = () => {
    exportToCSV(data || [], `analytics-${reportType}.csv`);
    addToast('✓ Exported analytics', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        >
          <option value="all">All Classes</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Export
        </button>
      </div>

      {/* Charts/Metrics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Attendance Rate</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average</p>
                <div className="w-full bg-gray-200 rounded h-4">
                  <div
                    className="bg-green-500 h-4 rounded"
                    style={{ width: data.averageAttendance + '%' }}
                  ></div>
                </div>
                <p className="text-sm font-bold mt-1">{data.averageAttendance || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Risk Distribution</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded p-3">
                <p className="text-xs text-green-600">Low Risk</p>
                <p className="text-2xl font-bold text-green-900">{data.lowRisk || 0}</p>
              </div>
              <div className="bg-yellow-50 rounded p-3">
                <p className="text-xs text-yellow-600">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-900">{data.mediumRisk || 0}</p>
              </div>
              <div className="bg-orange-50 rounded p-3">
                <p className="text-xs text-orange-600">High Risk</p>
                <p className="text-2xl font-bold text-orange-900">{data.highRisk || 0}</p>
              </div>
              <div className="bg-red-50 rounded p-3">
                <p className="text-xs text-red-600">Critical</p>
                <p className="text-2xl font-bold text-red-900">{data.critical || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
