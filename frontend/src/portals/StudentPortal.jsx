
import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import apiClient from '../services/apiClient';
import offlineQueueService from '../services/offlineQueueService';
import ErrorBoundary from '../components/ErrorBoundary';
import { ToastContainer, useToast } from '../components/Toast';
import { exportToCSV, exportToJSON } from '../utils/exportHelpers';
import { sanitizeInput } from '../utils/validation';
import './StudentPortal.css';

/**
 * StudentPortal Component
 * Main portal for student users with tabs for:
 * - Dashboard (attendance overview, courses, metrics)
 * - Attendance (QR code scanning)
 * - Timetable (class schedule)
 * - Notifications (messages and alerts)
 * - Profile (account info, devices)
 * 
 * Role Requirements: student, learner, pupil
 * Auth: Requires valid JWT token
 * Real-time: Socket.IO enabled for notifications
 */
const StudentPortal = ({ user, token, onLogout }) => {
  // State Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Initialize toasts state for components that need it
  const [componentToasts, setComponentToasts] = useState([]);

  // Verify user is authenticated and has student role
  useEffect(() => {
    if (!user) {
      setError('User not authenticated');
      return;
    }
    
    const userRole = String(user.role || '').toLowerCase();
    const isStudent = userRole.includes('student') || userRole.includes('learner') || userRole.includes('pupil');
    
    if (!isStudent) {
      setError(`Access denied. Expected student role, got: ${user.role}`);
    }
  }, [user]);

  // Set token on apiClient when it changes
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  /**
   * Refresh dashboard data from database with loading state
   */
  const refreshDashboard = async () => {
    try {
      setRefreshing(true);
      const data = await apiClient.getStudentDashboard();
      setDashboard(data);
      addToast('✓ Dashboard refreshed', 'success');
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      addToast('Error refreshing dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Logout user and clear authentication
   */
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Call logout API endpoint
      await apiClient.logout();
      
      // Clear token and auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Disconnect socket
      if (socketService.socket) {
        socketService.disconnect();
      }
      
      // Call parent logout handler if provided
      if (onLogout) {
        onLogout();
      }
      
      addToast('✓ Logged out successfully', 'success');
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local data even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (socketService.socket) {
        socketService.disconnect();
      }
      if (onLogout) {
        onLogout();
      }
      addToast('Logged out', 'success');
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Sync offline queue when online
   */
  const syncOfflineQueue = async () => {
    try {
      const result = await offlineQueueService.syncQueue(apiClient);
      if (result.success && result.processed > 0) {
        addToast(`✓ ${result.processed} offline scans synced`, 'success');
        setQueueStatus(offlineQueueService.getQueueStatus());
        await refreshDashboard();
      }
    } catch (err) {
      console.error('Error syncing queue:', err);
      addToast('Error syncing offline data', 'error');
    }
  };

  /**
   * Setup real-time event listeners for Socket.IO events
   */
  const setupRealTimeListeners = () => {
    // New notification (real-time push)
    socketService.on('new_notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      addToast(`📬 ${data.title || 'New notification'}`, 'info');
    });

    // Admin messages
    socketService.on('admin:message', (data) => {
      setNotifications(prev => [data, ...prev]);
      addToast('📨 New message from admin', 'info');
    });

    // Broadcast announcements
    socketService.on('broadcast:announcement', (data) => {
      setNotifications(prev => [data, ...prev]);
      addToast('📢 ' + data.message, 'info');
    });

    // System alerts
    socketService.on('system:alert', (data) => {
      if (data.severity === 'critical') {
        addToast('🚨 ' + data.message, 'error');
      }
    });

    // Attendance session opened
    socketService.on('attendance:opened', (data) => {
      addToast(`✓ Attendance opened for ${data.className}`, 'success');
      // Refresh dashboard to show active session
      refreshDashboard();
    });

    // Attendance session closed
    socketService.on('attendance:closed', (data) => {
      addToast(`Attendance closed for ${data.className}`, 'info');
    });

    // Device offline/online
    window.addEventListener('device:online', () => {
      addToast('✓ Device online - syncing offline data', 'success');
      syncOfflineQueue();
    });

    window.addEventListener('device:offline', () => {
      addToast('⚠️  Device offline - scans will be queued', 'warning');
    });
  };

  // Initialize socket and fetch data
  useEffect(() => {
    if (!user || !token) return;

    const initialize = async () => {
      try {
        setIsLoading(true);

        // Setup Socket.IO for real-time updates
        await socketService.connect(token, user.id, 'student');
        addToast('Connected to real-time updates', 'success');

        // Fetch initial data from database (parallel requests)
        const [dashboardData, timetableData, notificationsData] = await Promise.all([
          apiClient.getStudentDashboard(),
          apiClient.getStudentTimetable(),
          apiClient.getStudentNotifications()
        ]);

        setDashboard(dashboardData);
        setTimetable(timetableData);
        setNotifications(notificationsData.data || []);

        // Check offline queue status
        const status = offlineQueueService.getQueueStatus();
        setQueueStatus(status);

        // Setup real-time listeners
        setupRealTimeListeners();

        // Try to sync offline queue if online
        if (status.isOnline && status.totalItems > 0) {
          await syncOfflineQueue();
        }

        setError(null);
      } catch (err) {
        console.error('Error initializing:', err);
        setError(err.message);
        addToast('Error loading portal: ' + err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Auto-refresh dashboard when enabled
  useEffect(() => {
    if (!user || !autoRefresh || activeTab !== 'dashboard') return;

    const interval = setInterval(() => {
      refreshDashboard();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, autoRefresh, activeTab]);

  // Fetch updated notifications periodically (ONLY when on notifications tab)
  useEffect(() => {
    if (activeTab !== 'notifications') return;
    
    const interval = setInterval(async () => {
      try {
        const data = await apiClient.getStudentNotifications();
        setNotifications(data.data || []);
      } catch (err) {
        console.error('Error refreshing notifications:', err);
      }
    }, 5000); // Refresh every 5 seconds, not 3

    return () => clearInterval(interval);
  }, [activeTab]); // ONLY depends on activeTab, prevents infinite loops

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading student portal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-bold mb-2">Error Loading Portal</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ErrorBoundary>
        {/* Header */}
        <header className="bg-white shadow sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
              <p className="text-gray-600">Welcome, {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700">Auto-refresh</span>
              </label>
              {refreshing && <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full"></div>}
              <button
                onClick={refreshDashboard}
                disabled={refreshing}
                className={`btn-base btn-primary ${refreshing ? 'btn-loading' : ''}`}
                title="Refresh data"
                aria-label="Refresh dashboard data"
              >
                {!refreshing && '🔄'}
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`btn-base btn-danger ${isLoggingOut ? 'btn-loading' : ''}`}
                title="Logout"
                aria-label="Logout from account"
              >
                {!isLoggingOut && (
                  <>
                    <span className="hidden sm:inline">🚪 Logout</span>
                    <span className="sm:hidden">🚪</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Offline warning with queue status */}
        {queueStatus && !queueStatus.isOnline && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700 flex justify-between items-center">
              <span>⚠️ You are offline. ({queueStatus.pending} pending scans)</span>
              {queueStatus.pending > 0 && (
                <button
                  onClick={syncOfflineQueue}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Sync Now
                </button>
              )}
            </p>
          </div>
        )}

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Main Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading student portal...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
            <h2 className="text-red-800 font-bold mb-2">Error Loading Portal</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
              <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-hide" role="tablist">
                  {[
                    { id: 'dashboard', label: '📊 Dashboard', short: '📊' },
                    { id: 'attendance', label: '📱 QR Attendance', short: '📱 QR' },
                    { id: 'timetable', label: '📅 Timetable', short: '📅' },
                    { id: 'notifications', label: '🔔 Notifications', short: '🔔' },
                    { id: 'grades', label: '📈 Grades', short: '📈' },
                    { id: 'resources', label: '📚 Resources', short: '📚' },
                    { id: 'performance', label: '🎯 Performance', short: '🎯' },
                    { id: 'profile', label: '👤 Profile', short: '👤' },
                    { id: 'settings', label: '⚙️ Settings', short: '⚙️' },
                    { id: 'support', label: '💬 Support', short: '💬' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-label={`Navigate to ${tab.label}`}
                      className={`py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.short}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <main className="max-w-7xl mx-auto px-4 py-6" role="main">
              {activeTab === 'dashboard' && <DashboardTab data={dashboard} onRefresh={refreshDashboard} onExport={() => exportToCSV((dashboard?.data?.courses || []).map(c => ({ name: c.course_name, code: c.course_code, attendance: c.attendance_percentage })), 'attendance.csv')} />}
              {activeTab === 'attendance' && <AttendanceTab user={user} onQRScanned={refreshDashboard} addToast={addToast} />}
              {activeTab === 'timetable' && <TimetableTab data={timetable} onExport={() => { const data = Array.isArray(timetable) ? timetable : (timetable?.data || []); exportToCSV(data.map(c => ({ class: c.className || c.name, time: c.start_time, room: c.classroom })), 'timetable.csv'); }} />}
              {activeTab === 'notifications' && <NotificationsTab notifications={notifications} setNotifications={setNotifications} addToast={addToast} onRefresh={() => { setNotifications([...notifications]); }} />}
              {activeTab === 'grades' && <GradesTab addToast={addToast} />}
              {activeTab === 'resources' && <ResourcesTab addToast={addToast} />}
              {activeTab === 'performance' && <PerformanceTab addToast={addToast} />}
              {activeTab === 'profile' && <ProfileTab user={user} onExport={() => exportToJSON({ user }, 'profile.json')} addToast={addToast} />}
              {activeTab === 'settings' && <SettingsTab addToast={addToast} />}
              {activeTab === 'support' && <SupportTab addToast={addToast} />}
            </main>
          </>
        )}
      </ErrorBoundary>
    </div>
  );
};

/**
 * Dashboard Tab - Attendance overview and risk scores
 */
const DashboardTab = ({ data, onRefresh, onExport }) => {
  if (!data) return <div className="text-center py-8">Loading...</div>;

  // Destructure data from backend response (unwrap from response envelope)
  const dashboardData = data.data || data; // Handle both wrapped and unwrapped responses
  const summary = dashboardData.summary || {};
  const courses = dashboardData.courses || [];
  const todayClasses = dashboardData.todayClasses || [];

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end flex-wrap">
        <button
          onClick={onRefresh}
          className="btn-base btn-primary"
          aria-label="Refresh dashboard"
        >
          🔄 <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={onExport}
          className="btn-base btn-success"
          aria-label="Export data to CSV"
        >
          ⬇️ <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Courses */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-gray-500 text-sm font-medium">Total Courses</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {summary.totalCourses || 0}
          </p>
        </div>

        {/* Overall Attendance */}
        <div className={`rounded-lg shadow p-6 hover:shadow-lg transition ${
          (summary.overallAttendance || 0) > 70 
            ? 'bg-green-50 border-l-4 border-green-500' 
            : 'bg-yellow-50 border-l-4 border-yellow-500'
        }`}>
          <h3 className={`text-sm font-medium ${
            (summary.overallAttendance || 0) > 70 
              ? 'text-green-600' 
              : 'text-yellow-600'
          }`}>Overall Attendance</h3>
          <p className="text-3xl font-bold mt-2">
            {summary.overallAttendance || 0}%
          </p>
        </div>

        {/* Today's Classes */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-gray-500 text-sm font-medium">Today's Classes</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {summary.todayClassesCount || 0}
          </p>
        </div>

        {/* Unread Notifications */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-gray-500 text-sm font-medium">Unread Messages</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {summary.unreadNotifications || 0}
          </p>
        </div>
      </div>

      {/* Today's Classes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📍 Today's Classes</h3>
        {todayClasses && todayClasses.length > 0 ? (
          <div className="space-y-4">
            {todayClasses.map(cls => (
              <div
                key={cls.id}
                className="border border-blue-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-blue-900">{cls.course_name}</h4>
                    <p className="text-blue-700 text-sm">
                      ✓ Lecturer: {cls.lecturer_name || 'N/A'}
                    </p>
                    <p className="text-blue-700 text-sm">
                      🕐 Time: {cls.start_time} - {cls.end_time}
                    </p>
                    <p className="text-blue-700 text-sm">
                      📍 Status: {cls.checkin_status === 'checked_in' ? '✅ Checked In' : '⏳ Not Checked In'}
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm whitespace-nowrap"
                  >
                    Scan QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No classes today</p>
        )}
      </div>

      {/* Enrolled Courses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📚 Your Courses</h3>
        {courses && courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map(course => (
              <div
                key={course.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{course.course_name}</h4>
                    <p className="text-gray-600 text-sm">Code: {course.course_code}</p>
                    <p className="text-gray-600 text-sm">Lecturer: {course.lecturer_name || 'N/A'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{width: `${course.attendance_percentage || 0}%`}}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{course.attendance_percentage || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No enrolled courses</p>
        )}
      </div>
    </div>
  );
};

/**
 * Attendance Tab - QR code scanning
 */
const AttendanceTab = ({ user, onQRScanned, addToast }) => {
  const [scanning, setScanning] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startScanning = async () => {
    setScanning(true);
    setQrResult(null);
    
    try {
      // Get geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
          addToast(`✓ Location detected (${pos.coords.accuracy.toFixed(0)}m accuracy)`, 'success');
        }, (err) => {
          addToast('⚠️ Location access denied', 'warning');
        });
      } else {
        addToast('❌ Geolocation not supported', 'error');
      }

      // TODO: Integrate QR code scanner library
      // Simulate successful scan
      setTimeout(() => {
        setQrResult({
          message: 'Attendance marked successfully',
          scanTime: new Date().toLocaleTimeString()
        });
        onQRScanned();
        addToast('✓ Attendance marked!', 'success');
      }, 2000);

    } catch (err) {
      console.error('Scanning error:', err);
      addToast('Error during scan: ' + err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">📱 QR Code Attendance</h2>

      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-yellow-700">
            ⚠️ You are offline. Scans will be queued and synced when online.
          </p>
        </div>
      )}

      {location && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
          <p className="text-green-700 text-sm">
            ✓ Location detected: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            (±{location.accuracy.toFixed(0)}m)
          </p>
        </div>
      )}

      {qrResult && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-bold text-blue-900">✓ Scan Successful</h3>
          <p className="text-blue-700 text-sm mt-2">{qrResult.message}</p>
          <p className="text-blue-600 text-xs mt-1">{qrResult.scanTime}</p>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
        {scanning ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>📷 Point camera at QR code...</p>
          </div>
        ) : (
          <p className="text-gray-500">QR Scanner Area</p>
        )}
      </div>

      <button
        onClick={startScanning}
        disabled={scanning}
        className={`btn-base btn-primary w-full ${scanning ? 'btn-loading' : ''}`}
        aria-label={scanning ? 'Scanning QR code' : 'Start QR code scan'}
      >
        {!scanning && '▶️ Start QR Scan'}
      </button>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">ℹ️ How it works:</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Ensure location services are enabled</li>
          <li>Click "Start QR Scan" button</li>
          <li>Point your camera at the QR code</li>
          <li>Wait for confirmation message</li>
          <li>If offline, scan will sync when you're back online</li>
        </ol>
      </div>
    </div>
  );
};

/**
 * Timetable Tab - Class schedule
 */
const TimetableTab = ({ data, onExport }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState('all');

  if (!data) return <div className="text-center py-8">Loading...</div>;

  // Handle both wrapped and unwrapped responses
  const timetableData = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : data.classes || []);
  
  const filteredClasses = timetableData.filter(cls => {
    const matchesSearch = (cls.className || cls.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cls.instructor || cls.lecturerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDay = filterDay === 'all' || cls.dayOfWeek === filterDay;
    return matchesSearch && matchesDay;
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search classes or lecturer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
          className="form-input flex-1"
          aria-label="Search classes or lecturer"
        />
        <select
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          className="form-input"
          aria-label="Filter by day"
        >
          <option value="all">All Days</option>
          {days.map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <button
          onClick={onExport}
          className="btn-base btn-success whitespace-nowrap"
          aria-label="Export timetable"
        >
          ⬇️ <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Timetable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lecturer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClasses.length > 0 ? (
                filteredClasses.map(cls => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{cls.className || cls.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{cls.instructor || cls.lecturerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cls.dayOfWeek || 'N/A'} {cls.startTime || cls.start_time || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{cls.classroom || cls.room || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600">
        Showing {filteredClasses.length} of {timetableData.length} classes
      </p>
    </div>
  );
};

/**
 * Notifications Tab - Real-time messages
 */
const NotificationsTab = ({ notifications = [], setNotifications, addToast, onRefresh }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  const filtered = (Array.isArray(notifications) ? notifications : []).filter(notif => {
    const typeMatch = filterType === 'all' || notif.type === filterType;
    const readMatch = filterRead === 'all' || 
                      (filterRead === 'unread' ? !notif.read && !notif.read_status : notif.read || notif.read_status);
    return typeMatch && readMatch;
  });

  const notificationTypes = [...new Set((Array.isArray(notifications) ? notifications : []).map(n => n.type || 'general'))];

  const handleMarkAsRead = async (notifId) => {
    try {
      await apiClient.markNotificationAsRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read_status: true } : n));
      addToast('✓ Marked as read', 'success');
    } catch (err) {
      console.error('Error marking as read:', err);
      addToast('Error marking notification', 'error');
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await apiClient.deleteNotification(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      addToast('✓ Notification deleted', 'success');
    } catch (err) {
      console.error('Error deleting:', err);
      addToast('Error deleting notification', 'error');
    }
  };

  const handleExport = () => {
    const data = filtered.map(n => ({
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read ? 'Read' : 'Unread',
      timestamp: new Date(n.timestamp).toLocaleString()
    }));
    exportToCSV(data, 'notifications.csv');
    addToast('✓ Exported to CSV', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="all">All Types</option>
          {notificationTypes.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        >
          <option value="all">All Messages</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
        </select>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition whitespace-nowrap"
        >
          ⬇️ Export
        </button>

        <span className="px-4 py-2 bg-blue-50 rounded text-sm">
          {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((notif, idx) => (
            <div
              key={idx}
              className={`rounded-lg shadow p-4 border-l-4 ${
                !notif.read_status ? 'bg-blue-50 border-l-blue-600' : 'bg-white border-l-gray-300'
              } transition hover:shadow-md`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      notif.type === 'alert' ? 'bg-red-100 text-red-800' :
                      notif.type === 'system' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {(notif.type || 'general').toUpperCase()}
                    </span>
                    {!notif.read_status && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                  </div>
                  <h3 className="font-semibold text-gray-800">{notif.title || 'Notification'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notif.timestamp).toLocaleDateString()} {new Date(notif.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!notif.read_status && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="btn-base btn-primary btn-sm whitespace-nowrap"
                      aria-label="Mark notification as read"
                    >
                      <span className="hidden sm:inline">Mark Read</span>
                      <span className="sm:hidden">✓</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="btn-base btn-outline text-red-600 border-red-600 hover:bg-red-600 hover:text-white btn-sm whitespace-nowrap"
                    aria-label="Delete notification"
                  >
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">×</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <p className="text-lg">No notifications found</p>
            <p className="text-sm mt-2">All caught up! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Grades Tab - View academic grades and performance
 */
const GradesTab = ({ addToast }) => {
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await apiClient.get('/student/grades');
        if (response.data?.success) {
          setGrades(response.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch grades:', err);
        addToast('Failed to load grades', 'error');
      } finally {
        setGradesLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const calculateGPA = (gradesList) => {
    if (!gradesList.length) return 0;
    const total = gradesList.reduce((sum, g) => sum + (g.score || 0), 0);
    return (total / gradesList.length).toFixed(2);
  };

  const getGradeColor = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {gradesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
        </div>
      ) : (
        <>
          {/* GPA Card */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 shadow text-white">
            <h3 className="text-lg font-semibold mb-2">Cumulative GPA</h3>
            <p className="text-4xl font-bold">{calculateGPA(grades)}</p>
            <p className="text-blue-100 text-sm mt-2">Based on {grades.length} grades</p>
          </div>

          {/* Grades Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Course</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Assessment</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Score</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Grade</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? grades.map((grade, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{grade.course_name}</td>
                    <td className="px-6 py-4 text-gray-700">{grade.assessment_type || 'Exam'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded font-semibold ${getGradeColor(grade.score)}`}>
                        {grade.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-900">{grade.grade_letter || 'N/A'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No grades available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Resources Tab - Access course materials and documents
 */
const ResourcesTab = ({ addToast }) => {
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await apiClient.get('/student/resources');
        if (response.data?.success) {
          setResources(response.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch resources:', err);
        addToast('Failed to load resources', 'error');
      } finally {
        setResourcesLoading(false);
      }
    };

    fetchResources();
  }, []);

  const categories = ['all', 'lecture_notes', 'assignments', 'textbooks', 'videos'];
  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => r.category === selectedCategory);

  const getCategoryIcon = (category) => {
    const icons = {
      lecture_notes: '📄',
      assignments: '📝',
      textbooks: '📚',
      videos: '🎥'
    };
    return icons[category] || '📎';
  };

  const handleDownload = (resource) => {
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
      addToast(`Downloading ${resource.name}...`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-600'
            }`}
          >
            {category === 'all' ? 'All Resources' : category.replace(/_/g, ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resourcesLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
          </div>
        ) : filteredResources.length > 0 ? (
          filteredResources.map((resource, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{getCategoryIcon(resource.category)}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{resource.category.replace(/_/g, ' ')}</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{resource.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{resource.course_name}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{resource.uploaded_date}</span>
                <button
                  onClick={() => handleDownload(resource)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-lg">No resources available in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Performance Tab - Analytics and progress tracking
 */
const PerformanceTab = ({ addToast }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await apiClient.get('/student/performance');
        if (response.data?.success) {
          setPerformanceData(response.data.data || {});
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
        addToast('Failed to load performance data', 'error');
      } finally {
        setPerformanceLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  return (
    <div className="space-y-6">
      {performanceLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-600 text-sm font-medium">📊 Average Score</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{performanceData?.averageScore ? `${performanceData.averageScore.toFixed(1)}%` : 'N/A'}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-600 text-sm font-medium">📈 Improvement</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{performanceData?.improvement ? `+${performanceData.improvement}%` : 'N/A'}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-purple-600 text-sm font-medium">✅ Completed Assignments</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{performanceData?.completedAssignments || 0}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-600 text-sm font-medium">🎯 Target Achievement</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{performanceData?.targetAchievement ? `${performanceData.targetAchievement}%` : '0%'}</p>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">📋 Performance Summary</h3>
            <div className="space-y-4">
              {performanceData?.coursePerformance && performanceData.coursePerformance.length > 0 ? (
                performanceData.coursePerformance.map((course, idx) => (
                  <div key={idx} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{course.courseName}</span>
                      <span className="text-sm font-semibold text-blue-600">{course.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${course.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No performance data available</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {performanceData?.recommendations && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3">💡 Recommendations</h4>
              <ul className="space-y-2 text-blue-800 text-sm">
                {performanceData.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Settings Tab - User preferences and account settings
 */
const SettingsTab = ({ addToast }) => {
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    darkMode: false,
    language: 'en'
  });

  const handleSettingChange = (key) => {
    const newSettings = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(newSettings);
  };

  const handleLanguageChange = (e) => {
    setLocalSettings({ ...localSettings, language: e.target.value });
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await apiClient.put('/student/settings', localSettings);
      if (response.data?.success) {
        addToast('Settings saved successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const resetPassword = async () => {
    try {
      const response = await apiClient.post('/student/reset-password', {});
      if (response.data?.success) {
        addToast('Password reset link sent to your email', 'success');
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      addToast('Failed to reset password', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          📬 Notification Preferences
        </h3>
        <div className="space-y-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.emailNotifications}
              onChange={() => handleSettingChange('emailNotifications')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="ml-3 text-gray-700 dark:text-gray-300">Email Notifications</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.pushNotifications}
              onChange={() => handleSettingChange('pushNotifications')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="ml-3 text-gray-700 dark:text-gray-300">Push Notifications</span>
          </label>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          🎨 Display Preferences
        </h3>
        <div className="space-y-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.darkMode}
              onChange={() => handleSettingChange('darkMode')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="ml-3 text-gray-700 dark:text-gray-300">Dark Mode</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={localSettings.language}
              onChange={handleLanguageChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="en">🇺🇸 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          🔐 Security Settings
        </h3>
        <button
          onClick={resetPassword}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition"
        >
          Reset Password
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={saveSettings}
          disabled={settingsLoading}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition"
        >
          {settingsLoading ? 'Saving...' : '✓ Save Settings'}
        </button>
        <button
          onClick={() => setLocalSettings({
            emailNotifications: true,
            pushNotifications: true,
            darkMode: false,
            language: 'en'
          })}
          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-medium transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

/**
 * Support Tab - FAQ and help resources
 */
const SupportTab = ({ addToast }) => {
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I mark attendance?',
      answer: 'Go to the Attendance tab, click on "Start QR Scan", and scan the QR code displayed by your lecturer. Your location will be captured for verification.'
    },
    {
      id: 2,
      question: 'What happens if I miss a class?',
      answer: 'You will receive a notification about the absence. Contact your lecturer or check the support section for more information.'
    },
    {
      id: 3,
      question: 'How can I view my timetable?',
      answer: 'Click on the Timetable tab to see your class schedule. You can filter by day or search for specific classes.'
    },
    {
      id: 4,
      question: 'Can I access the app offline?',
      answer: 'Yes! You can scan QR codes offline, and they will sync when you regain internet connection. Check the "Offline Queue" status for pending scans.'
    },
    {
      id: 5,
      question: 'How do I update my profile information?',
      answer: 'Go to the Profile tab and click "Edit Profile". Update your information and save the changes.'
    },
    {
      id: 6,
      question: 'Who do I contact for technical issues?',
      answer: 'Use the "Contact Support" form below to submit your issue. Our support team will respond within 24 hours.'
    },
    {
      id: 7,
      question: 'How can I change my password?',
      answer: 'Go to Settings tab and click "Reset Password". You will receive an email with a link to create a new password.'
    },
    {
      id: 8,
      question: 'What should I do if I cannot scan QR code?',
      answer: 'Ensure you have granted camera permissions. Try restarting the app. If problem persists, contact support.'
    }
  ];

  const handleSubmitSupport = async () => {
    if (!supportMessage.trim()) {
      addToast('Please enter a message', 'error');
      return;
    }

    setSubmittingSupport(true);
    try {
      const response = await apiClient.post('/student/support', {
        message: supportMessage,
        subject: 'Student Support Request'
      });
      if (response.data?.success) {
        addToast('Support request sent successfully! We will respond soon.', 'success');
        setSupportMessage('');
      }
    } catch (err) {
      console.error('Failed to submit support request:', err);
      addToast('Failed to submit support request', 'error');
    } finally {
      setSubmittingSupport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* FAQ Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          ❓ Frequently Asked Questions
        </h3>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setSelectedFaq(selectedFaq === faq.id ? null : faq.id)}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <span className="font-medium text-gray-900 dark:text-white text-left">
                  {faq.question}
                </span>
                <span className={`text-gray-500 transition ${selectedFaq === faq.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {selectedFaq === faq.id && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          📧 Contact Support
        </h3>
        <div className="space-y-4">
          <textarea
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            placeholder="Describe your issue or question here..."
            rows="5"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSubmitSupport}
            disabled={submittingSupport}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition"
          >
            {submittingSupport ? 'Sending...' : '📨 Send Support Request'}
          </button>
        </div>
      </div>

      {/* Quick Contact Info */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">📞 Quick Contact Info</h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>📧 Email: support@academix.edu</li>
          <li>📞 Phone: +1 (555) 123-4567</li>
          <li>⏰ Hours: Monday - Friday, 9 AM - 5 PM (UTC)</li>
          <li>💬 Live Chat: Available during business hours</li>
          <li>📱 Telegram: @AcademixSupport</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Profile Tab - Device history and settings
 */
const ProfileTab = ({ user, onExport, addToast }) => {
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeviceHistory = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getDeviceHistory();
        setDeviceHistory(data || []);
      } catch (err) {
        console.error('Error fetching device history:', err);
        addToast('Error loading device history', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceHistory();
  }, [addToast]);

  const handleExportProfile = () => {
    const profileData = {
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      exportedAt: new Date().toLocaleString()
    };
    exportToJSON(profileData, 'profile.json');
    addToast('✓ Profile exported', 'success');
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Remove this device from your account?')) return;
    try {
      await apiClient.removeDevice(deviceId);
      setDeviceHistory(prev => prev.filter(d => d.id !== deviceId));
      addToast('✓ Device removed', 'success');
    } catch (err) {
      console.error('Error removing device:', err);
      addToast('Error removing device', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg">👤 Account Information</h3>
          <button
            onClick={handleExportProfile}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
          >
            ⬇️ Export Profile
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-gray-500 text-sm mb-1">Full Name</p>
            <p className="font-bold text-lg">{user.name}</p>
          </div>
          <div className="border-l-4 border-green-600 pl-4">
            <p className="text-gray-500 text-sm mb-1">Email</p>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
          <div className="border-l-4 border-purple-600 pl-4">
            <p className="text-gray-500 text-sm mb-1">Student ID</p>
            <p className="font-bold text-lg">{user.studentId}</p>
          </div>
          <div className="border-l-4 border-orange-600 pl-4">
            <p className="text-gray-500 text-sm mb-1">Department</p>
            <p className="font-bold text-lg">{user.department}</p>
          </div>
        </div>
      </div>

      {/* Device History Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">🔐 Device History</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : deviceHistory.length > 0 ? (
          <div className="space-y-3">
            {deviceHistory.map((device, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded p-4 hover:shadow-md transition flex justify-between items-start"
              >
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{device.device_name || 'Unknown Device'}</p>
                  <p className="text-gray-600 text-sm mt-1">ID: {device.device_id}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Last used: {new Date(device.last_login).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveDevice(device.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition whitespace-nowrap ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No device history</p>
        )}
      </div>
    </div>
  );
};

export default StudentPortal;
