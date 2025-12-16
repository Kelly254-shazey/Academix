/**
 * Admin Portal - Enhanced
 * Features: Error boundaries, toasts, refresh, search, filtering, export, validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import apiClient from '../services/apiClient';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast, ToastContainer } from '../components/Toast';
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
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        if (!mounted) return;
        setIsLoading(true);
        addToast('Initializing admin portal...', 'info');

        // Connect to Socket.IO
        await socketService.connect(token, user.id, 'admin');

        // Fetch all data with fallbacks
        const [dashboardData, usersData, logsData, analyticsData] = await Promise.all([
          apiClient.get('/admin/overview').catch(() => ({ totalUsers: 0, studentCount: 0, lecturerCount: 0, activeSessions: 0 })),
          apiClient.get('/admin/users').catch(() => ({ data: [] })),
          apiClient.get('/admin/audit-log').catch(() => ({ data: [] })),
          apiClient.get('/admin/reports?type=attendance').catch(() => ({ averageAttendance: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, critical: 0 }))
        ]);

        if (!mounted) return;
        setDashboard(dashboardData);
        setUsers(usersData.data || []);
        setAuditLogs(logsData.data || []);
        setAnalytics(analyticsData);

        setupRealTimeListeners();
        addToast('✓ Admin portal ready', 'success');
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('Error initializing:', err);
        const errorMsg = err.message || 'Failed to initialize';
        setError(errorMsg);
        addToast('Error: ' + errorMsg, 'error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
      socketService.disconnect();
    };
  }, [user.id, token]);

  // Auto-refresh data
  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'dashboard') {
      interval = setInterval(() => {
        refreshDashboard();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
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
        apiClient.get('/admin/overview').catch(() => ({ totalUsers: 0, studentCount: 0, lecturerCount: 0, activeSessions: 0 })),
        apiClient.get('/admin/users').catch(() => ({ data: [] })),
        apiClient.get('/admin/audit-log').catch(() => ({ data: [] })),
        apiClient.get('/admin/reports?type=attendance').catch(() => ({ averageAttendance: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, critical: 0 }))
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
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs - Sticky */}
        <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 py-2" role="tablist">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'users', label: '👥 Users' },
                { id: 'communications', label: '💬 Messages' },
                { id: 'complaints', label: '📝 Complaints' },
                { id: 'reports', label: '📋 Reports' },
                { id: 'department', label: '🏢 Department' },
                { id: 'audit', label: '📋 Audit' },
                { id: 'analytics', label: '📈 Analytics' },
                { id: 'profile', label: '👤 Profile' },
                { id: 'settings', label: '⚙️ Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3 rounded text-xs font-medium transition text-center ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          {activeTab === 'complaints' && 
            <ComplaintsTab 
              addToast={addToast}
            />
          }
          {activeTab === 'reports' && 
            <ReportsTab 
              user={user}
              addToast={addToast}
            />
          }
          {activeTab === 'department' && 
            <DepartmentTab 
              user={user}
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
          {activeTab === 'profile' && 
            <ProfileTab 
              user={user}
              addToast={addToast}
            />
          }
          {activeTab === 'settings' && 
            <SettingsTab 
              user={user}
              addToast={addToast}
            />
          }
        </main>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
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

  // Ensure users is always an array
  const usersList = Array.isArray(users) ? users : [];

  const filtered = usersList.filter(u => {
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
      await apiClient.delete(`/admin/users/${userId}`);
      onUpdate(usersList.filter(u => u.id !== userId));
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
        Showing {filtered.length} of {usersList.length} users
      </p>
    </div>
  );
};

/**
 * Communications Tab - Send messages to lecturers and students
 */
const CommunicationsTab = ({ addToast }) => {
  const [messageType, setMessageType] = useState('broadcast');
  const [recipientRole, setRecipientRole] = useState('students');
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
      await apiClient.post('/admin/communications/send', {
        recipientRole,
        messageType,
        subject,
        message,
        priority: messageType === 'alert' ? 'high' : 'normal'
      });

      setSubject('');
      setMessage('');
      addToast('✓ Message sent successfully', 'success');
    } catch (err) {
      addToast('Error sending message', 'error');
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
            <option value="students">All Students</option>
            <option value="lecturers">All Lecturers</option>
            <option value="all">All Users</option>
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

  // Ensure logs is always an array
  const logsList = Array.isArray(logs) ? logs : [];

  const actions = [...new Set(logsList.map(l => l.action))];

  const filtered = logsList.filter(l => {
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

/**
 * Complaints Tab - Anonymous student complaints
 */
const ComplaintsTab = ({ addToast }) => {
  const [complaints, setComplaints] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/complaints').catch(() => ({ data: [] }));
      setComplaints(response.data || []);
    } catch (err) {
      setComplaints([]);
      addToast('No complaints available', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await apiClient.put(`/admin/complaints/${id}`, { status });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      addToast('✓ Status updated', 'success');
    } catch (err) {
      addToast('Error updating status', 'error');
    }
  };

  const complaintsList = Array.isArray(complaints) ? complaints : [];
  const filtered = complaintsList.filter(c => filterStatus === 'all' || c.status === filterStatus);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">📝 Anonymous Complaints</h2>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading complaints...</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((complaint, idx) => (
            <div key={complaint.id || idx} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  complaint.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {complaint.status || 'pending'}
                </span>
                <span className="text-xs text-gray-500">
                  {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : 'Recent'}
                </span>
              </div>
              <p className="text-gray-800 mb-3">{complaint.message || 'Anonymous complaint'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(complaint.id || idx, 'investigating')}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleStatusUpdate(complaint.id || idx, 'resolved')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p>No complaints found</p>
        </div>
      )}
    </div>
  );
};

/**
 * Reports Tab - Send reports to super admin
 */
const ReportsTab = ({ user, addToast }) => {
  const [reportType, setReportType] = useState('general');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !content) {
      addToast('Please fill all fields', 'error');
      return;
    }

    try {
      setSending(true);
      await apiClient.post('/admin/reports/super-admin', {
        type: reportType,
        subject,
        content,
        adminId: user.id
      });
      setSubject('');
      setContent('');
      addToast('✓ Report sent to super admin', 'success');
    } catch (err) {
      addToast('Error sending report', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">📋 Send Report to Super Admin</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          >
            <option value="general">General Report</option>
            <option value="incident">Incident Report</option>
            <option value="performance">Performance Report</option>
            <option value="resource">Resource Request</option>
            <option value="urgent">Urgent Issue</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Report subject"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="8"
            placeholder="Detailed report content"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
        >
          {sending ? '📤 Sending...' : '📤 Send Report'}
        </button>
      </form>
    </div>
  );
};

/**
 * Department Tab - Manage departmental issues
 */
const DepartmentTab = ({ user, addToast }) => {
  const [issues, setIssues] = useState([]);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartmentIssues();
  }, []);

  const fetchDepartmentIssues = async () => {
    try {
      setLoading(true);
      const dept = user.department || 'general';
      const response = await apiClient.get(`/admin/department/${dept}/issues`).catch(() => ({ data: [] }));
      setIssues(response.data || []);
    } catch (err) {
      setIssues([]);
      addToast('No department issues found', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newIssue.title || !newIssue.description) {
      addToast('Please fill all fields', 'error');
      return;
    }

    try {
      const response = await apiClient.post('/admin/department/issues', {
        ...newIssue,
        department: user.department,
        createdBy: user.id
      });
      setIssues(prev => [response.data, ...prev]);
      setNewIssue({ title: '', description: '', priority: 'medium' });
      addToast('✓ Issue created', 'success');
    } catch (err) {
      addToast('Error creating issue', 'error');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await apiClient.put(`/admin/department/issues/${id}`, { status });
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      addToast('✓ Status updated', 'success');
    } catch (err) {
      addToast('Error updating status', 'error');
    }
  };

  const issuesList = Array.isArray(issues) ? issues : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🏢 Department: {user.department || 'Not Assigned'}</h2>
        
        <form onSubmit={handleCreateIssue} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Issue title"
              value={newIssue.title}
              onChange={(e) => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            />
            <select
              value={newIssue.priority}
              onChange={(e) => setNewIssue(prev => ({ ...prev, priority: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea
            placeholder="Issue description"
            value={newIssue.description}
            onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ➕ Create Issue
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">Loading issues...</div>
        ) : (
          issuesList.map(issue => (
            <div key={issue.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{issue.title}</h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    issue.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    issue.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {issue.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    issue.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {issue.status || 'pending'}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 mb-3">{issue.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(issue.id, 'in-progress')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleStatusUpdate(issue.id, 'resolved')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Profile Tab - Admin profile management
 */
const ProfileTab = ({ user, addToast }) => {
  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    department: user.department || '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put('/admin/profile', profile);
      addToast('✓ Profile updated', 'success');
    } catch (err) {
      addToast('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">👤 Admin Profile</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
        >
          {saving ? '💾 Saving...' : '💾 Save Profile'}
        </button>
      </form>
    </div>
  );
};

/**
 * Settings Tab - Admin settings
 */
const SettingsTab = ({ user, addToast }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: false,
    theme: 'light',
    language: 'en'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.put('/admin/settings', settings);
      addToast('✓ Settings saved', 'success');
    } catch (err) {
      addToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">⚙️ Admin Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Notifications</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
              className="w-4 h-4"
            />
            <span>Enable email notifications</span>
          </label>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-3">Dashboard</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
              className="w-4 h-4"
            />
            <span>Auto-refresh dashboard</span>
          </label>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-3">Appearance</h3>
          <select
            value={settings.theme}
            onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          >
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-3">Language</h3>
          <select
            value={settings.language}
            onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
        >
          {saving ? '💾 Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminPortal;
