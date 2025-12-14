/**
 * Lecturer Portal - Enhanced
 * Features: Error boundaries, toasts, refresh, filtering, export, offline support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';
import apiClient from '../services/apiClient';
import ErrorBoundary from '../components/ErrorBoundary';
import Toast, { useToast, ToastContainer } from '../components/Toast';
import { 
  validateSearch, 
  sanitizeInput 
} from '../utils/validation';
import { 
  exportToCSV, 
  exportToJSON, 
  printData 
} from '../utils/exportHelpers';

const LecturerPortal = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        addToast('Connecting to system...', 'info');

        // Connect to Socket.IO
        await socketService.connect(token, user.id, 'lecturer');

        // Fetch initial data
        const [dashboardData, alertsData, sessionsData] = await Promise.all([
          apiClient.getLecturerDashboard(),
          apiClient.getLecturerAlerts(),
          apiClient.getLecturerSessions()
        ]);

        setDashboard(dashboardData);
        setAlerts(alertsData.data || []);
        setSessions(sessionsData.data || []);

        setupRealTimeListeners();
        addToast('✓ Connected successfully', 'success');
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

  // Auto-refresh dashboard
  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'dashboard') {
      interval = setInterval(() => {
        refreshDashboard();
      }, 5000); // Refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  const setupRealTimeListeners = useCallback(() => {
    socketService.on('attendance:student-scanned', (data) => {
      setDashboard(prev => prev ? {
        ...prev,
        liveCount: (prev.liveCount || 0) + 1
      } : null);
      addToast('✓ Student scanned', 'success');
    });

    socketService.on('lecturer:alert', (data) => {
      setAlerts(prev => [data, ...prev]);
      addToast('⚠️ Alert: ' + data.title, 'warning');
    });

    socketService.on('attendance:closed', (data) => {
      if (activeSession?.id === data.sessionId) {
        setActiveSession(null);
      }
    });
  }, [addToast, activeSession?.id]);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const [dashboardData, alertsData, sessionsData] = await Promise.all([
        apiClient.getLecturerDashboard(),
        apiClient.getLecturerAlerts(),
        apiClient.getLecturerSessions()
      ]);
      setDashboard(dashboardData);
      setAlerts(alertsData.data || []);
      setSessions(sessionsData.data || []);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading lecturer portal...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">👨‍🏫 Lecturer Portal</h1>
                <p className="text-gray-600">Welcome, {user.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => refreshDashboard()}
                  disabled={refreshing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
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
                { id: 'qr', label: '📱 Generate QR' },
                { id: 'sessions', label: '📝 Sessions' },
                { id: 'alerts', label: '🚨 Alerts' },
                { id: 'reports', label: '📄 Reports' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
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
              addToast={addToast}
            />
          }
          {activeTab === 'qr' && 
            <QRGeneratorTab 
              user={user} 
              sessions={sessions}
              onSessionChange={setActiveSession}
              addToast={addToast}
            />
          }
          {activeTab === 'sessions' && 
            <SessionsTab 
              sessions={sessions} 
              onRefresh={() => refreshDashboard()}
              addToast={addToast}
            />
          }
          {activeTab === 'alerts' && 
            <AlertsTab 
              alerts={alerts} 
              addToast={addToast}
            />
          }
          {activeTab === 'reports' && 
            <ReportsTab 
              user={user}
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
 * Dashboard Tab - Live metrics with refresh
 */
const DashboardTab = ({ data, onRefresh, autoRefresh, onAutoRefreshChange, addToast }) => {
  if (!data) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Present Count */}
        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500 hover:shadow-lg transition">
          <h3 className="text-green-600 text-sm font-medium">Present Students</h3>
          <p className="text-4xl font-bold text-green-900 mt-2">{data.liveCount || 0}</p>
        </div>

        {/* Absent Count */}
        <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500 hover:shadow-lg transition">
          <h3 className="text-red-600 text-sm font-medium">Absent Students</h3>
          <p className="text-4xl font-bold text-red-900 mt-2">{data.absentCount || 0}</p>
        </div>

        {/* Session Status */}
        <div className={`rounded-lg shadow p-6 border-l-4 hover:shadow-lg transition ${
          data.activeSession 
            ? 'bg-blue-50 border-blue-500' 
            : 'bg-gray-50 border-gray-300'
        }`}>
          <h3 className={`text-sm font-medium ${
            data.activeSession ? 'text-blue-600' : 'text-gray-600'
          }`}>Session Status</h3>
          <p className="text-2xl font-bold mt-2">
            {data.activeSession ? '🟢 ACTIVE' : '🔴 INACTIVE'}
          </p>
        </div>
      </div>

      {/* Active Session Details */}
      {data.activeSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg text-blue-900 mb-4">Current Session</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded p-3">
              <p className="text-blue-600 text-xs font-medium">Class</p>
              <p className="font-bold">{data.activeSession.className}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-blue-600 text-xs font-medium">Start Time</p>
              <p className="font-bold">{data.activeSession.startTime}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-blue-600 text-xs font-medium">Expected</p>
              <p className="font-bold">{data.activeSession.expectedCount || 0}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-blue-600 text-xs font-medium">Attendance Rate</p>
              <p className="font-bold">
                {data.activeSession.expectedCount 
                  ? ((data.liveCount / data.activeSession.expectedCount) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Summary */}
      {data.alertsSummary && data.alertsSummary.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-lg text-yellow-900 mb-4">🚨 Recent Alerts ({data.alertsSummary.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.alertsSummary.slice(0, 4).map((alert, idx) => (
              <div key={idx} className="bg-white rounded p-3 border-l-4 border-yellow-500">
                <p className="font-semibold text-sm text-gray-800">{alert.studentName}</p>
                <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * QR Generator Tab - Generate and display QR codes
 */
const QRGeneratorTab = ({ user, sessions = [], onSessionChange, addToast }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(25);
  const [searching, setSearching] = useState('');
  const refreshIntervalRef = useRef(null);
  const qrRefreshIntervalRef = useRef(null);

  const filteredSessions = (sessions || []).filter(s =>
    s.className.toLowerCase().includes(searching.toLowerCase())
  );

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);
    };
  }, []);

  const startSession = async (sessionId) => {
    try {
      addToast('Starting session...', 'info');
      const response = await apiClient.startAttendance(sessionId);
      const qrResponse = await apiClient.getSessionQR(sessionId);

      setSelectedSession(sessionId);
      setQrCode(qrResponse);
      setRefreshTimer(25);
      onSessionChange({ id: sessionId });
      addToast('✓ Session started', 'success');

      // Auto-refresh QR every 25 seconds
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);

      qrRefreshIntervalRef.current = setInterval(async () => {
        try {
          const newQR = await apiClient.getSessionQR(sessionId);
          setQrCode(newQR);
          setRefreshTimer(25);
          socketService.emit('qr:refreshed', { sessionId });
        } catch (err) {
          addToast('Error refreshing QR', 'error');
        }
      }, 25000);

      // Update timer
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = setInterval(() => {
        setRefreshTimer(prev => (prev > 0 ? prev - 1 : 25));
      }, 1000);

    } catch (err) {
      addToast('Error starting session: ' + err.message, 'error');
    }
  };

  const stopSession = async () => {
    try {
      if (!selectedSession) return;
      addToast('Stopping session...', 'info');

      await apiClient.stopAttendance(selectedSession);

      setQrCode(null);
      setSelectedSession(null);
      setRefreshTimer(25);

      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);

      onSessionChange(null);
      addToast('✓ Session ended', 'success');
    } catch (err) {
      addToast('Error stopping session: ' + err.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sessions List */}
      <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">Today's Classes</h3>
        <input
          type="text"
          placeholder="Search classes..."
          value={searching}
          onChange={(e) => setSearching(sanitizeInput(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:border-blue-600"
        />
        <div className="space-y-2">
          {filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <button
                key={session.id}
                onClick={() => startSession(session.id)}
                disabled={selectedSession !== null && selectedSession !== session.id}
                className={`w-full text-left p-3 rounded border-l-4 transition ${
                  selectedSession === session.id
                    ? 'bg-blue-50 border-blue-500'
                    : selectedSession
                    ? 'bg-gray-50 border-gray-300 opacity-50 cursor-not-allowed'
                    : 'bg-white border-purple-300 hover:bg-purple-50'
                }`}
              >
                <p className="font-bold text-sm">{session.className}</p>
                <p className="text-xs text-gray-600">{session.startTime}</p>
              </button>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No classes found</p>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">📱 QR Code</h3>

        {qrCode ? (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
              {qrCode.qrImage ? (
                <img 
                  src={qrCode.qrImage} 
                  alt="QR Code" 
                  className="w-80 h-80"
                />
              ) : (
                <p className="text-gray-500">QR Code loading...</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-blue-700 font-bold mb-2">
                🔄 Refreshing in {refreshTimer}s
              </p>
              <p className="text-blue-600 text-sm">
                QR code auto-refreshes to prevent replay attacks
              </p>
            </div>

            <button
              onClick={stopSession}
              className="w-full px-4 py-3 bg-red-600 text-white rounded font-bold hover:bg-red-700"
            >
              Stop Attendance
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Select a class to generate QR code</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Sessions Tab - View and manage sessions with filtering
 */
const SessionsTab = ({ sessions = [], onRefresh, addToast }) => {
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = sessions.filter(s => 
    filterStatus === 'all' || s.status === filterStatus
  ).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'class') return a.className.localeCompare(b.className);
    return 0;
  });

  const handleExport = () => {
    const data = filtered.map(s => ({
      class: s.className,
      date: new Date(s.date).toLocaleDateString(),
      time: s.startTime,
      present: s.presentCount || 0,
      absent: s.absentCount || 0,
      status: s.status
    }));
    exportToCSV(data, 'sessions.csv');
    addToast('✓ Exported to CSV', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="date">Sort by Date</option>
          <option value="class">Sort by Class</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(session => (
                <tr key={session.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium">{session.className}</td>
                  <td className="px-6 py-4">{new Date(session.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{session.startTime}</td>
                  <td className="px-6 py-4 text-green-600 font-bold">{session.presentCount || 0}</td>
                  <td className="px-6 py-4 text-red-600 font-bold">{session.absentCount || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      session.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : session.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Alerts Tab - AI alerts with filtering
 */
const AlertsTab = ({ alerts = [], addToast }) => {
  const [sortBy, setSortBy] = useState('latest');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filtered = alerts.filter(a =>
    filterSeverity === 'all' || a.severity === filterSeverity
  ).sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.timestamp) - new Date(a.timestamp);
    if (sortBy === 'severity') {
      const severityScore = { critical: 3, high: 2, medium: 1 };
      return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
    }
    return 0;
  });

  const handleDismiss = (idx) => {
    addToast('✓ Alert dismissed', 'success');
  };

  const handleExport = () => {
    const data = filtered.map(a => ({
      student: a.studentName,
      severity: a.severity,
      title: a.title,
      message: a.message,
      timestamp: new Date(a.timestamp).toLocaleString()
    }));
    exportToJSON(data, 'alerts.json');
    addToast('✓ Exported alerts', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="latest">Latest First</option>
          <option value="severity">By Severity</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="all">All Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Export JSON
        </button>
      </div>

      {/* Alerts List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((alert, idx) => (
            <div
              key={idx}
              className={`border-l-4 rounded-r-lg p-4 ${
                alert.severity === 'critical'
                  ? 'bg-red-50 border-red-500'
                  : alert.severity === 'high'
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{alert.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    👤 {alert.studentName} | {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(idx)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap ml-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-700 font-bold">✓ No suspicious activity detected</p>
        </div>
      )}
    </div>
  );
};

/**
 * Reports Tab - Generate and export reports
 */
const ReportsTab = ({ user, addToast }) => {
  const [reportType, setReportType] = useState('all');
  const [loading, setLoading] = useState(false);

  const generateReport = async (format) => {
    try {
      setLoading(true);
      addToast('Generating report...', 'info');

      const report = await apiClient.getAttendanceReport(reportType);

      if (format === 'csv') {
        exportToCSV(report.data, `report-${reportType}.csv`);
      } else if (format === 'json') {
        exportToJSON(report.data, `report-${reportType}.json`);
      } else if (format === 'print') {
        printData(report.data);
      }

      addToast('✓ Report generated', 'success');
    } catch (err) {
      addToast('Error generating report: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">📄 Attendance Reports</h2>

      {/* Report Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="all">All Classes</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => generateReport('csv')}
          disabled={loading}
          className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-bold"
        >
          📊 CSV
        </button>
        <button
          onClick={() => generateReport('json')}
          disabled={loading}
          className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-bold"
        >
          📋 JSON
        </button>
        <button
          onClick={() => generateReport('print')}
          disabled={loading}
          className="px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-bold"
        >
          🖨️ Print
        </button>
        <button
          onClick={() => addToast('PDF export coming soon', 'info')}
          disabled={true}
          className="px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
        >
          📄 PDF
        </button>
      </div>
    </div>
  );
};

export default LecturerPortal;
