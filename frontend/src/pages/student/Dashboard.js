import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import apiClient from '../../services/apiClient';
import AttendanceOverview from '../../components/student/AttendanceOverview';
import SchedulePanel from '../../components/student/SchedulePanel';
import QRCheckInPanel from '../../components/student/QRCheckInPanel';
import NotificationsPanel from '../../components/student/NotificationsPanel';
import CourseList from '../../components/student/CourseList';
import CalendarView from '../../components/student/CalendarView';
import AIInsightsPanel from '../../components/student/AIInsightsPanel';
import AttendanceHistory from '../../components/student/AttendanceHistory';
import MessagesPanel from '../../components/student/MessagesPanel';
import ProfilePanel from '../../components/student/ProfilePanel';
import SettingsPanel from '../../components/student/SettingsPanel';
import ReportsPanel from '../../components/student/ReportsPanel';
import SupportPanel from '../../components/student/SupportPanel';
import CourseEnrollment from '../../components/student/CourseEnrollment';

export default function StudentDashboard(){
  const { user } = useAuth();
  const { notifications, socket, connected } = useNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [dashboardData, setDashboardData] = useState({
    courses: [],
    todayClasses: [],
    notifications: [],
    summary: {
      totalCourses: 0,
      overallAttendance: 0,
      todayClassesCount: 0,
      unreadNotifications: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiClient.getStudentDashboard();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      // apiClient handles auth errors automatically
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !connected || !user) return;

    // Listen for class status updates
    const handleClassStarted = (data) => {
      console.log('📚 Class started:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.map(cls =>
          cls.id === data.classId ? { ...cls, status: 'active' } : cls
        )
      }));
    };

    const handleClassCancelled = (data) => {
      console.log('❌ Class cancelled:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.filter(cls => cls.id !== data.classId)
      }));
    };

    const handleRoomChanged = (data) => {
      console.log('🏢 Room changed:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.map(cls =>
          cls.id === data.classId ? { ...cls, location: data.newLocation } : cls
        )
      }));
    };

    const handleLecturerDelay = (data) => {
      console.log('⏰ Lecturer delay:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.map(cls =>
          cls.id === data.classId ? {
            ...cls,
            delayed: true,
            delayMinutes: data.delayMinutes
          } : cls
        )
      }));
    };

    // Listen for attendance verification updates
    const handleAttendanceVerified = (data) => {
      if (data.studentId === user.id) {
        console.log('✅ Attendance verified:', data);
        // Refresh dashboard data to get updated attendance stats
        fetchDashboardData();
      }
    };

    // Listen for session updates
    const handleSessionStarted = (data) => {
      console.log('🎯 Session started:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.map(cls =>
          cls.session_id === data.sessionId ? { ...cls, status: 'active' } : cls
        )
      }));
    };

    const handleSessionDelayed = (data) => {
      console.log('⏳ Session delayed:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.map(cls =>
          cls.session_id === data.sessionId ? {
            ...cls,
            delayed: true,
            delayMinutes: data.delayMinutes,
            start_time: data.newStartTime
          } : cls
        )
      }));
    };

    const handleSessionCancelled = (data) => {
      console.log('🚫 Session cancelled:', data);
      setDashboardData(prev => ({
        ...prev,
        todayClasses: prev.todayClasses.filter(cls => cls.session_id !== data.sessionId)
      }));
    };

    // Listen for QR code rotations
    const handleQRRotated = (data) => {
      console.log('🔄 QR code rotated:', data);
      // Could trigger a refresh or show notification
    };

    // Listen for roster updates
    const handleRosterUpdated = (data) => {
      console.log('📊 Roster updated:', data);
      // Could update attendance counts if needed
    };

    // Attach listeners
    socket.on('class-started', handleClassStarted);
    socket.on('class-cancelled', handleClassCancelled);
    socket.on('room-changed', handleRoomChanged);
    socket.on('lecturer-delay', handleLecturerDelay);
    socket.on('lecturer-attendance-verified', handleAttendanceVerified);
    socket.on('lecturer-session-started', handleSessionStarted);
    socket.on('lecturer-session-delayed', handleSessionDelayed);
    socket.on('lecturer-session-cancelled', handleSessionCancelled);
    socket.on('lecturer-qr-rotated', handleQRRotated);
    socket.on('lecturer-roster-updated', handleRosterUpdated);

    // Cleanup listeners
    return () => {
      socket.off('class-started', handleClassStarted);
      socket.off('class-cancelled', handleClassCancelled);
      socket.off('room-changed', handleRoomChanged);
      socket.off('lecturer-delay', handleLecturerDelay);
      socket.off('lecturer-attendance-verified', handleAttendanceVerified);
      socket.off('lecturer-session-started', handleSessionStarted);
      socket.off('lecturer-session-delayed', handleSessionDelayed);
      socket.off('lecturer-session-cancelled', handleSessionCancelled);
      socket.off('lecturer-qr-rotated', handleQRRotated);
      socket.off('lecturer-roster-updated', handleRosterUpdated);
    };
  }, [socket, connected, user]);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800 max-w-md">
          <p className="font-bold mb-2">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        <div className="relative px-3 sm:px-6 md:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">📚 Welcome back, {user?.name || 'Student'}!</h1>
              <p className="text-indigo-100 text-sm sm:text-base md:text-lg">Track your attendance and stay on top of your studies</p>
              <div className="flex items-center mt-3 space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-indigo-200">
                  {connected ? 'Real-time updates active' : 'Connecting...'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  const newTheme = theme === 'light' ? 'dark' : 'light';
                  setTheme(newTheme);
                  localStorage.setItem('theme', newTheme);
                  document.documentElement.classList.toggle('dark', newTheme === 'dark');
                }}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                title="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <div className="hidden md:block text-6xl opacity-20">🎓</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        {/* Tabs Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'schedule', label: 'Today\'s Schedule', icon: '📅' },
            { id: 'enrollment', label: 'Course Enrollment', icon: '📚' },
              { id: 'attendance', label: 'Attendance History', icon: '📈' },
              { id: 'messages', label: 'Messages', icon: '💬' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
              { id: 'reports', label: 'Reports', icon: '📋' },
              { id: 'support', label: 'Support', icon: '🆘' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Overall Attendance</p>
                    <p className={`text-2xl sm:text-3xl font-bold mt-1 ${
                      Math.round(dashboardData.summary.overallAttendance) >= 80 ? 'text-green-600' :
                      Math.round(dashboardData.summary.overallAttendance) >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>{Math.round(dashboardData.summary.overallAttendance)}%</p>
                  </div>
                  <div className="text-3xl opacity-30">✅</div>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${
                    Math.round(dashboardData.summary.overallAttendance) >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                    Math.round(dashboardData.summary.overallAttendance) >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`} style={{width: `${Math.round(dashboardData.summary.overallAttendance)}%`}}></div>
                </div>
                <p className={`text-xs mt-2 ${
                  Math.round(dashboardData.summary.overallAttendance) >= 80 ? 'text-green-600' :
                  Math.round(dashboardData.summary.overallAttendance) >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(dashboardData.summary.overallAttendance) >= 80 ? 'Excellent attendance!' :
                   Math.round(dashboardData.summary.overallAttendance) >= 60 ? 'Good, keep it up!' : 'Needs improvement'}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Classes Today</p>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{dashboardData.summary.todayClassesCount}</p>
                  </div>
                  <div className="text-3xl opacity-30">📅</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">{dashboardData.todayClasses.length > 0 ? `Next: ${dashboardData.todayClasses[0].course_name} at ${dashboardData.todayClasses[0].start_time}` : 'No classes today'}</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                    <p className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1">{dashboardData.summary.totalCourses}</p>
                  </div>
                  <div className="text-3xl opacity-30">📖</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">All courses active</p>
              </div>
            </div>

            {/* Active Classes Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 md:mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <span className="mr-2">📚</span>
                Active Classes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.todayClasses.filter(cls => cls.status === 'active').map(cls => (
                  <div key={cls.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900">{cls.course_name}</h3>
                    <p className="text-sm text-blue-700">Lecturer: {cls.lecturer_name}</p>
                    <p className="text-sm text-blue-600">Time: {cls.start_time} - {cls.end_time}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  </div>
                ))}
                {dashboardData.todayClasses.filter(cls => cls.status === 'active').length === 0 && (
                  <p className="text-gray-500 col-span-full text-center py-4">No active classes at the moment</p>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Left Column - Wide */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <AttendanceOverview overall={Math.round(dashboardData.summary.overallAttendance)} perCourse={dashboardData.courses} />
                <CourseList courses={dashboardData.courses} />
                <CalendarView events={[]} />
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-4 md:space-y-6">
                <SchedulePanel classes={dashboardData.todayClasses} />
                <QRCheckInPanel lastCheckIn={null} />
                <AIInsightsPanel />
                <NotificationsPanel notifications={notifications} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
            <SchedulePanel classes={dashboardData.todayClasses} />
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-4">QR Code Attendance</h2>
            <QRCheckInPanel lastCheckIn={null} />
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Recent QR Codes</h3>
              <p className="text-gray-500">QR codes received from lecturers will appear here for verification.</p>
              {/* Add QR history component if available */}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <AttendanceHistory />
        )}

        {activeTab === 'messages' && (
          <MessagesPanel />
        )}

        {activeTab === 'profile' && (
          <ProfilePanel />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel />
        )}

        {activeTab === 'enrollment' && (
          <CourseEnrollment />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel />
        )}

        {activeTab === 'support' && (
          <SupportPanel />
        )}
      </div>
    </div>
  );
}
