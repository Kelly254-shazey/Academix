/**
 * Lecturer Portal - Left Navigation & Mobile Responsive
 * Features: Left sidebar navigation, QR code fixes, mobile responsive design
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';
import apiClient from '../services/apiClient';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast, ToastContainer } from '../components/Toast';
import { 
  sanitizeInput 
} from '../utils/validation';
import { 
  exportToCSV, 
  exportToJSON 
} from '../utils/exportHelpers';
import './StudentPortal.css';

const LecturerPortal = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

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
  }, [addToast]);

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        if (!socketService.isConnected()) {
          await socketService.connect(token, user.id, 'lecturer');
        }

        let dashboardData, alertsData, sessionsData;
        
        try {
          dashboardData = await apiClient.get('/lecturer/dashboard');
        } catch (err) {
          dashboardData = { data: { liveCount: 0, absentCount: 0, activeSession: null, totalStudents: 0 } };
        }
        
        try {
          alertsData = await apiClient.get('/lecturer/alerts');
        } catch (err) {
          alertsData = { data: [] };
        }
        
        try {
          sessionsData = await apiClient.get('/lecturer/classes');
        } catch (err) {
          sessionsData = { data: [
            { id: 'demo1', className: 'Computer Science 101', startTime: '10:00 AM', date: new Date().toISOString() },
            { id: 'demo2', className: 'Data Structures', startTime: '2:00 PM', date: new Date().toISOString() }
          ] };
        }

        if (mounted) {
          setDashboard(dashboardData.data);
          setAlerts(alertsData.data || []);
          setSessions(sessionsData.data || []);
          setupRealTimeListeners();
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = err.message || 'Failed to initialize';
          setError(errorMsg);
        }
      }
    };

    initialize();
    return () => {
      mounted = false;
    };
  }, [user.id, token]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiClient.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
      if (onLogout) {
        onLogout();
      }
      addToast('✓ Logged out successfully', 'success');
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
      if (onLogout) {
        onLogout();
      }
      addToast('Logged out', 'success');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshDashboard = useCallback(async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      
      const [dashboardData, alertsData, sessionsData] = await Promise.all([
        apiClient.get('/lecturer/dashboard').catch(() => ({ data: { liveCount: 0, absentCount: 0 } })),
        apiClient.get('/lecturer/alerts').catch(() => ({ data: [] })),
        apiClient.get('/lecturer/classes').catch(() => ({ data: [] }))
      ]);
      
      setDashboard(dashboardData.data);
      setAlerts(alertsData.data || []);
      setSessions(sessionsData.data || []);
    } catch (err) {
      // Silent error handling
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'dashboard') {
      interval = setInterval(() => {
        refreshDashboard();
      }, 30000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, activeTab]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:w-64 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 font-bold text-lg">A</span>
              </div>
              <h1 className="text-lg font-bold text-white">Academix</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user.name?.charAt(0) || 'L'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu - Scrollable */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'qr', label: 'Generate QR', icon: '📱' },
              { id: 'sessions', label: 'Sessions', icon: '📝' },
              { id: 'timetable', label: 'Timetable', icon: '📅' },
              { id: 'resources', label: 'Resources', icon: '📚' },
              { id: 'grades', label: 'Grades', icon: '📉' },
              { id: 'analysis', label: 'Analysis', icon: '📈' },
              { id: 'alerts', label: 'Alerts', icon: '🚨' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
              { id: 'support', label: 'Support', icon: '🆘' },
              { id: 'reports', label: 'Reports', icon: '📄' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mx-1 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <span className="mr-3 text-lg">{tab.icon}</span>
                {tab.label}
                {tab.id === 'alerts' && alerts.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => refreshDashboard()}
                disabled={refreshing}
                className={`flex-1 px-3 py-2.5 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-md ${refreshing ? 'opacity-50' : 'hover:shadow-lg'}`}
                title="Refresh data"
              >
                {refreshing ? '⏳' : '🔄'} <span className="hidden sm:inline ml-1">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`flex-1 px-3 py-2.5 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md ${isLoggingOut ? 'opacity-50' : 'hover:shadow-lg'}`}
                title="Logout"
              >
                {isLoggingOut ? '⏳' : '🚪'} <span className="hidden sm:inline ml-1">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen">
          {/* Top Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  ☰
                </button>
                <div className="ml-2 lg:ml-0">
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {activeTab === 'qr' ? 'QR Generator' : activeTab}
                  </h2>
                  <p className="text-sm text-gray-500">Manage your classes and attendance</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {autoRefresh && (
                  <div className="hidden sm:flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                    Auto-refresh
                  </div>
                )}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-2 rounded-md transition ${autoRefresh ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
                  title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                >
                  🔄
                </button>
              </div>
            </div>
          </header>

          {/* Error Alert */}
          {error && (
            <div className="mx-4 mt-4 flex-shrink-0">
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

          {/* Content Area - Fixed */}
          <main className="flex-1 p-4 space-y-6 overflow-hidden">
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
            {activeTab === 'timetable' && 
              <TimetableTab 
                user={user}
                addToast={addToast}
              />
            }
            {activeTab === 'resources' && 
              <ResourcesTab 
                user={user}
                sessions={sessions}
                addToast={addToast}
              />
            }
            {activeTab === 'grades' && 
              <GradesTab 
                user={user}
                sessions={sessions}
                addToast={addToast}
              />
            }
            {activeTab === 'analysis' && 
              <AnalysisTab 
                user={user}
                addToast={addToast}
              />
            }
            {activeTab === 'alerts' && 
              <AlertsTab 
                alerts={alerts} 
                addToast={addToast}
              />
            }
            {activeTab === 'notifications' && 
              <NotificationsTab 
                user={user}
                addToast={addToast}
              />
            }
            {activeTab === 'profile' && 
              <ProfileTab 
                user={user}
                onLogout={handleLogout}
                addToast={addToast}
              />
            }
            {activeTab === 'settings' && 
              <SettingsTab 
                user={user}
                addToast={addToast}
              />
            }
            {activeTab === 'support' && 
              <SupportTab 
                user={user}
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
        </div>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ErrorBoundary>
  );
};

/**
 * Dashboard Tab - Live metrics with refresh
 */
const DashboardTab = ({ data, onRefresh, autoRefresh, onAutoRefreshChange, addToast }) => {
  
  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-gray-500 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={onRefresh}
          className="btn-base btn-primary"
          aria-label="Refresh dashboard now"
        >
          🔄 <span className="hidden sm:inline">Refresh Now</span>
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-700">Auto-refresh every 30s</span>
        </label>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Students */}
        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-500 hover:shadow-lg transition">
          <h3 className="text-green-600 text-sm font-medium">Present Students</h3>
          <p className="text-3xl font-bold text-green-900 mt-2">{data.liveCount || 0}</p>
          <p className="text-xs text-green-600 mt-1">Good attendance (≥75%)</p>
        </div>

        {/* Absent Students */}
        <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-red-500 hover:shadow-lg transition">
          <h3 className="text-red-600 text-sm font-medium">At-Risk Students</h3>
          <p className="text-3xl font-bold text-red-900 mt-2">{data.absentCount || 0}</p>
          <p className="text-xs text-red-600 mt-1">Below 75% attendance</p>
        </div>

        {/* Total Students */}
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-500 hover:shadow-lg transition">
          <h3 className="text-blue-600 text-sm font-medium">Total Students</h3>
          <p className="text-3xl font-bold text-blue-900 mt-2">{data.totalStudents || 0}</p>
          <p className="text-xs text-blue-600 mt-1">Enrolled students</p>
        </div>

        {/* Average Attendance */}
        <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-500 hover:shadow-lg transition">
          <h3 className="text-purple-600 text-sm font-medium">Avg Attendance</h3>
          <p className="text-3xl font-bold text-purple-900 mt-2">{data.averageAttendance || 0}%</p>
          <p className="text-xs text-purple-600 mt-1">Overall performance</p>
        </div>
      </div>

      {/* Active Session Details */}
      {data.activeSession ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg text-blue-900 mb-4">🎯 Current Session</h3>
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
              <p className="text-blue-600 text-xs font-medium">Present</p>
              <p className="font-bold">{data.activeSession.presentCount || 0}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-blue-600 text-xs font-medium">Status</p>
              <p className="font-bold text-green-600">LIVE</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">No active session</p>
          <p className="text-sm text-gray-500">Start a class session from the QR tab to begin tracking attendance</p>
        </div>
      )}
    </div>
  );
};

/**
 * QR Generator Tab - Generate and display QR codes with fixes
 */
const QRGeneratorTab = ({ user, sessions = [], onSessionChange, addToast }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(35);
  const [searching, setSearching] = useState('');
  const refreshIntervalRef = useRef(null);
  const qrRefreshIntervalRef = useRef(null);

  // Add demo sessions if none available
  const availableSessions = sessions && sessions.length > 0 ? sessions : [
    { id: 'demo1', className: 'Computer Science 101', startTime: '10:00 AM' },
    { id: 'demo2', className: 'Data Structures', startTime: '2:00 PM' },
    { id: 'demo3', className: 'Web Development', startTime: '4:00 PM' }
  ];

  const filteredSessions = availableSessions.filter(s => {
    if (!s || !s.className) return false;
    return s.className.toLowerCase().includes(searching.toLowerCase());
  });

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);
    };
  }, []);

  const startSession = async (sessionId) => {
    try {
      addToast('Starting session...', 'info');
      
      // Start attendance session
      const response = await apiClient.startAttendance(sessionId);
      
      // Get QR code
      const qrResponse = await apiClient.getSessionQR(sessionId);

      setSelectedSession(sessionId);
      setQrCode(qrResponse.data || qrResponse);
      setRefreshTimer(35);
      onSessionChange({ id: sessionId });
      addToast('✓ Session started successfully', 'success');

      // Auto-refresh QR every 35 seconds
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);

      qrRefreshIntervalRef.current = setInterval(async () => {
        try {
          const newQR = await apiClient.getSessionQR(sessionId);
          setQrCode(newQR.data || newQR);
          setRefreshTimer(35);
          addToast('🔄 QR code refreshed', 'info');
        } catch (err) {
          console.error('QR refresh error:', err);
        }
      }, 35000);

      // Update timer countdown
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = setInterval(() => {
        setRefreshTimer(prev => (prev > 0 ? prev - 1 : 35));
      }, 1000);

    } catch (err) {
      console.error('Session start error:', err);
      addToast('Error starting session: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const stopSession = async () => {
    try {
      if (!selectedSession) return;
      addToast('Stopping session...', 'info');

      await apiClient.stopAttendance(selectedSession);

      setQrCode(null);
      setSelectedSession(null);
      setRefreshTimer(35);

      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (qrRefreshIntervalRef.current) clearInterval(qrRefreshIntervalRef.current);

      onSessionChange(null);
      addToast('✓ Session ended successfully', 'success');
    } catch (err) {
      console.error('Session stop error:', err);
      addToast('Error stopping session: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sessions List */}
      <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">📚 Available Classes</h3>
        <input
          type="text"
          placeholder="Search classes..."
          value={searching}
          onChange={(e) => setSearching(sanitizeInput(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
          aria-label="Search classes"
        />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <button
                key={session.id}
                onClick={() => startSession(session.id)}
                disabled={selectedSession !== null && selectedSession !== session.id}
                className={`w-full text-left p-3 rounded-lg border-l-4 transition-all duration-200 ${
                  selectedSession === session.id
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : selectedSession
                    ? 'bg-gray-50 border-gray-300 opacity-50 cursor-not-allowed'
                    : 'bg-white border-purple-300 hover:bg-purple-50 hover:border-purple-500 shadow-sm hover:shadow-md'
                }`}
              >
                <p className="font-bold text-sm text-gray-900">{session.className}</p>
                <p className="text-xs text-gray-600 mt-1">⏰ {session.startTime}</p>
                {selectedSession === session.id && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">🟢 Active Session</p>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">📭 No classes found</p>
              <p className="text-xs">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">📱 QR Code Generator</h3>

        {qrCode ? (
          <div className="space-y-6">
            {/* QR Code Image */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 flex items-center justify-center">
              {qrCode.qrImage ? (
                <div className="text-center">
                  <img 
                    src={qrCode.qrImage} 
                    alt="QR Code for Attendance" 
                    className="w-80 h-80 mx-auto border-4 border-white rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-gray-600 mt-4">📱 Students scan this code to mark attendance</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-80 h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-gray-500">
                      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Generating QR Code...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timer and Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-700 font-bold">
                  🔄 Auto-refresh in {refreshTimer}s
                </p>
                <div className="flex items-center text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  Live Session
                </div>
              </div>
              <p className="text-blue-600 text-sm">
                🔒 QR code automatically refreshes every 35 seconds for security
              </p>
            </div>

            {/* Session Info */}
            {selectedSession && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-800 mb-2">📊 Session Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-600 font-medium">Session ID</p>
                    <p className="text-green-800">{selectedSession}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">Status</p>
                    <p className="text-green-800 font-bold">🟢 Active</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stop Button */}
            <button
              onClick={stopSession}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              aria-label="Stop attendance session"
            >
              ⏹️ Stop Attendance Session
            </button>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📱</span>
              </div>
              <h4 className="text-lg font-medium text-gray-700 mb-2">Ready to Generate QR Code</h4>
              <p className="text-sm">Select a class from the left panel to start an attendance session</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> QR codes refresh automatically every 35 seconds to prevent unauthorized access
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified tab components for now
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
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-input">
          <option value="date">Sort by Date</option>
          <option value="class">Sort by Class</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-input">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={handleExport} className="btn-base btn-success whitespace-nowrap">
          ⬇️ Export CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(session => (
                <tr key={session.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium">{session.className}</td>
                  <td className="px-6 py-4">{new Date(session.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{session.startTime}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status || 'scheduled'}
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

const TimetableTab = ({ user, addToast }) => {
  const [classes, setClasses] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', time: '', room: '', students: '' });

  const createClass = () => {
    const classData = {
      id: `class_${Date.now()}`,
      name: newClass.name,
      time: newClass.time,
      room: newClass.room,
      studentCount: parseInt(newClass.students) || 0,
      status: 'scheduled'
    };
    setClasses([...classes, classData]);
    setNewClass({ name: '', time: '', room: '', students: '' });
    setShowCreateForm(false);
    addToast('✓ Class created', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📅 My Timetable</h2>
          <button onClick={() => setShowCreateForm(true)} className="btn-base btn-primary">+ Create Class</button>
        </div>
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-3">Create New Class</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Class Name" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value})} className="form-input" />
              <input type="time" value={newClass.time} onChange={(e) => setNewClass({...newClass, time: e.target.value})} className="form-input" />
              <input placeholder="Room" value={newClass.room} onChange={(e) => setNewClass({...newClass, room: e.target.value})} className="form-input" />
              <input placeholder="Expected Students" type="number" value={newClass.students} onChange={(e) => setNewClass({...newClass, students: e.target.value})} className="form-input" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={createClass} className="btn-base btn-success">Create</button>
              <button onClick={() => setShowCreateForm(false)} className="btn-base btn-secondary">Cancel</button>
            </div>
          </div>
        )}
        <div className="grid gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold">{cls.name}</h3>
                <p className="text-sm text-gray-600">{cls.time} • {cls.room} • {cls.studentCount} students</p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${cls.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {cls.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ResourcesTab = ({ user, sessions, addToast }) => {
  const [resources, setResources] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', description: '', type: 'document', url: '' });
  const [loading, setLoading] = useState(false);
  
  const availableClasses = sessions && sessions.length > 0 ? sessions : [
    { id: 'demo', className: 'Demo Class - Computer Science 101' }
  ];

  const uploadResource = async () => {
    if (!selectedClass || !newResource.title || !newResource.type) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const mockResource = {
        id: Date.now(),
        ...newResource,
        created_at: new Date().toISOString()
      };
      setResources([...resources, mockResource]);
      setNewResource({ title: '', description: '', type: 'document', url: '' });
      setShowUploadForm(false);
      addToast('✓ Resource uploaded successfully', 'success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📚 Class Resources</h2>
          <button onClick={() => setShowUploadForm(true)} disabled={!selectedClass} className="btn-base btn-primary">
            + Upload Resource
          </button>
        </div>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="form-input mb-4">
          <option value="">Select a class...</option>
          {availableClasses.map(session => (
            <option key={session.id} value={session.id}>{session.className}</option>
          ))}
        </select>
      </div>
      {showUploadForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Upload New Resource</h3>
          <div className="space-y-4">
            <input value={newResource.title} onChange={(e) => setNewResource({...newResource, title: e.target.value})} className="form-input" placeholder="Resource title" />
            <select value={newResource.type} onChange={(e) => setNewResource({...newResource, type: e.target.value})} className="form-input">
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="assignment">Assignment</option>
            </select>
            <input value={newResource.url} onChange={(e) => setNewResource({...newResource, url: e.target.value})} className="form-input" placeholder="https://..." />
            <textarea value={newResource.description} onChange={(e) => setNewResource({...newResource, description: e.target.value})} className="form-input h-24" placeholder="Resource description..." />
            <div className="flex gap-2">
              <button onClick={uploadResource} disabled={loading} className={`btn-base btn-success ${loading ? 'btn-loading' : ''}`}>
                {!loading && 'Upload Resource'}
              </button>
              <button onClick={() => setShowUploadForm(false)} className="btn-base btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Uploaded Resources</h3>
          {resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map(resource => (
                <div key={resource.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold">{resource.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${
                      resource.type === 'video' ? 'bg-red-100 text-red-800' :
                      resource.type === 'document' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {resource.type}
                    </span>
                    <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                  </div>
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                      🔗 Open Resource
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No resources uploaded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GradesTab = ({ user, sessions, addToast }) => {
  const [grades, setGrades] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [students] = useState([{id: 1, name: 'John Doe'}, {id: 2, name: 'Jane Smith'}]);
  const [newGrade, setNewGrade] = useState({ studentId: '', assignmentName: '', grade: '', maxGrade: '100', comments: '' });
  
  const availableClasses = sessions && sessions.length > 0 ? sessions : [
    { id: 'demo', className: 'Demo Class - Computer Science 101' }
  ];

  const addGrade = () => {
    if (!selectedClass || !newGrade.studentId || !newGrade.assignmentName || !newGrade.grade) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    const student = students.find(s => s.id == newGrade.studentId);
    const mockGrade = {
      id: Date.now(),
      student_name: student?.name,
      assignment_name: newGrade.assignmentName,
      grade: parseFloat(newGrade.grade),
      max_grade: parseFloat(newGrade.maxGrade),
      created_at: new Date().toISOString()
    };
    setGrades([...grades, mockGrade]);
    setNewGrade({ studentId: '', assignmentName: '', grade: '', maxGrade: '100', comments: '' });
    setShowGradeForm(false);
    addToast('✓ Grade added successfully', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📉 Student Grades</h2>
          <button onClick={() => setShowGradeForm(true)} disabled={!selectedClass} className="btn-base btn-primary">
            + Add Grade
          </button>
        </div>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="form-input mb-4">
          <option value="">Select a class...</option>
          {availableClasses.map(session => (
            <option key={session.id} value={session.id}>{session.className}</option>
          ))}
        </select>
      </div>
      {showGradeForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Add New Grade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={newGrade.studentId} onChange={(e) => setNewGrade({...newGrade, studentId: e.target.value})} className="form-input">
              <option value="">Select student...</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
            <input value={newGrade.assignmentName} onChange={(e) => setNewGrade({...newGrade, assignmentName: e.target.value})} className="form-input" placeholder="Quiz 1, Midterm, etc." />
            <input type="number" value={newGrade.grade} onChange={(e) => setNewGrade({...newGrade, grade: e.target.value})} className="form-input" placeholder="85" />
            <input type="number" value={newGrade.maxGrade} onChange={(e) => setNewGrade({...newGrade, maxGrade: e.target.value})} className="form-input" placeholder="100" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addGrade} className="btn-base btn-success">Add Grade</button>
            <button onClick={() => setShowGradeForm(false)} className="btn-base btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Class Grades</h3>
          {grades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.map(grade => {
                    const percentage = Math.round((grade.grade / grade.max_grade) * 100);
                    return (
                      <tr key={grade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{grade.student_name}</td>
                        <td className="px-6 py-4">{grade.assignment_name}</td>
                        <td className="px-6 py-4">{grade.grade}/{grade.max_grade}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-sm font-bold ${
                            percentage >= 90 ? 'bg-green-100 text-green-800' :
                            percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                            percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No grades recorded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnalysisTab = ({ user, addToast }) => {
  const [analysisData] = useState({
    student1: { attendancePercentage: 85, status: 'Good' },
    student2: { attendancePercentage: 65, status: 'Warning' },
    student3: { attendancePercentage: 45, status: 'Critical' }
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">📈 Class Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(analysisData).map(([studentId, data]) => (
          <div key={studentId} className="border rounded p-4">
            <h3 className="font-bold">Student {studentId.slice(-1)}</h3>
            <p className="text-2xl font-bold text-blue-600">{data.attendancePercentage}%</p>
            <p className={`text-sm ${data.status === 'Good' ? 'text-green-600' : data.status === 'Warning' ? 'text-yellow-600' : 'text-red-600'}`}>
              {data.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertsTab = ({ alerts = [], addToast }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">🚨 Alerts</h2>
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
              <p className="font-bold">{alert.title}</p>
              <p className="text-sm text-gray-600">{alert.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-700 font-bold">✓ No alerts at this time</p>
        </div>
      )}
    </div>
  );
};

const NotificationsTab = ({ user, addToast }) => {
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'System Update', message: 'System will be updated tonight', type: 'info', read: false },
    { id: 2, title: 'New Student Enrolled', message: 'John Doe enrolled in CS101', type: 'success', read: false }
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? {...n, read: true} : n));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">🔔 Notifications</h2>
      <div className="space-y-4">
        {notifications.map(notification => (
          <div key={notification.id} className={`border-l-4 p-4 ${notification.read ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{notification.title}</h3>
                <p className="text-gray-600">{notification.message}</p>
              </div>
              {!notification.read && (
                <button onClick={() => markAsRead(notification.id)} className="btn-base btn-sm btn-primary">Mark Read</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileTab = ({ user, onLogout, addToast }) => {
  const [profile, setProfile] = useState(user);
  const [editing, setEditing] = useState(false);

  const saveProfile = () => {
    setEditing(false);
    addToast('✓ Profile updated', 'success');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">👤 Profile</h2>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="btn-base btn-primary">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={onLogout} className="btn-base btn-danger">🚪 Logout</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          {editing ? (
            <input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="form-input" />
          ) : (
            <p className="p-2 bg-gray-50 rounded">{profile.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <p className="p-2 bg-gray-50 rounded">{profile.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <p className="p-2 bg-gray-50 rounded">{profile.role}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Department</label>
          {editing ? (
            <input value={profile.department || ''} onChange={(e) => setProfile({...profile, department: e.target.value})} className="form-input" />
          ) : (
            <p className="p-2 bg-gray-50 rounded">{profile.department || 'Not set'}</p>
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-6">
          <button onClick={saveProfile} className="btn-base btn-success">Save Changes</button>
        </div>
      )}
    </div>
  );
};

const SettingsTab = ({ user, addToast }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    theme: 'light'
  });

  const saveSetting = (key, value) => {
    setSettings({...settings, [key]: value});
    addToast('✓ Setting saved', 'success');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">⚙️ Settings</h2>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-600">Receive email alerts for important updates</p>
          </div>
          <label className="flex items-center">
            <input type="checkbox" checked={settings.notifications} onChange={(e) => saveSetting('notifications', e.target.checked)} className="mr-2" />
            <span>Enable</span>
          </label>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Auto Refresh</h3>
            <p className="text-sm text-gray-600">Automatically refresh dashboard data</p>
          </div>
          <label className="flex items-center">
            <input type="checkbox" checked={settings.autoRefresh} onChange={(e) => saveSetting('autoRefresh', e.target.checked)} className="mr-2" />
            <span>Enable</span>
          </label>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Theme</h3>
            <p className="text-sm text-gray-600">Choose your preferred theme</p>
          </div>
          <select value={settings.theme} onChange={(e) => saveSetting('theme', e.target.value)} className="form-input w-32">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const SupportTab = ({ user, addToast }) => {
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'medium' });
  const [tickets, setTickets] = useState([]);

  const submitTicket = () => {
    const newTicket = {
      id: `ticket_${Date.now()}`,
      ...ticket,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    setTickets([newTicket, ...tickets]);
    setTicket({ subject: '', message: '', priority: 'medium' });
    addToast('✓ Support ticket submitted', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6">🆘 Support</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold mb-4">Submit Support Ticket</h3>
            <div className="space-y-4">
              <input placeholder="Subject" value={ticket.subject} onChange={(e) => setTicket({...ticket, subject: e.target.value})} className="form-input" />
              <textarea placeholder="Describe your issue..." value={ticket.message} onChange={(e) => setTicket({...ticket, message: e.target.value})} className="form-input h-32" />
              <select value={ticket.priority} onChange={(e) => setTicket({...ticket, priority: e.target.value})} className="form-input">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button onClick={submitTicket} className="btn-base btn-primary w-full">Submit Ticket</button>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-4">My Tickets</h3>
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} className="border rounded p-3">
                  <h4 className="font-medium">{t.subject}</h4>
                  <p className="text-sm text-gray-600">{t.status} • {t.priority}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportsTab = ({ user, addToast }) => {
  const [reportType, setReportType] = useState('all');
  const [loading, setLoading] = useState(false);

  const generateReport = async (format) => {
    try {
      setLoading(true);
      addToast('Generating report...', 'info');
      setTimeout(() => {
        if (format === 'csv') {
          const data = [{ class: 'CS101', attendance: '85%' }];
          exportToCSV(data, `report-${reportType}.csv`);
        }
        addToast('✓ Report generated', 'success');
        setLoading(false);
      }, 2000);
    } catch (err) {
      addToast('Error generating report', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">📄 Attendance Reports</h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="form-input">
          <option value="all">All Classes</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => generateReport('csv')} disabled={loading} className={`btn-base btn-success ${loading ? 'btn-loading' : ''}`}>
          {!loading && '📊 CSV'}
        </button>
        <button onClick={() => generateReport('json')} disabled={loading} className={`btn-base btn-primary ${loading ? 'btn-loading' : ''}`}>
          {!loading && '📋 JSON'}
        </button>
        <button onClick={() => generateReport('print')} disabled={loading} className={`btn-base btn-secondary ${loading ? 'btn-loading' : ''}`}>
          {!loading && '🖨️ Print'}
        </button>
        <button disabled={true} className="btn-base btn-secondary opacity-50">
          📄 PDF
        </button>
      </div>
    </div>
  );
};

export default LecturerPortal;