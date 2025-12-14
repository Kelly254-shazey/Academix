import React, { useEffect, useState } from 'react';
import LecturerOverview from '../../components/lecturer/LecturerOverview';
import LecturerControls from '../../components/lecturer/LecturerControls';
import LecturerQRDisplay from '../../components/lecturer/LecturerQRDisplay';
import RosterManagement from '../../components/lecturer/RosterManagement';
import LecturerSchedulePanel from '../../components/lecturer/LecturerSchedulePanel';
import useSocket from '../../hooks/useSocket';
import apiClient from '../../utils/apiClient';

export default function LecturerDashboard(){
  const [dashboardData, setDashboardData] = useState({
    classes: [],
    pendingActions: [],
    summary: {
      totalClasses: 0,
      totalSessions: 0,
      totalStudents: 0,
      todayAttendance: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { socket: socketRef } = useSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch classes from database
        const classesRes = await apiClient.get('/classes/lecturer');
        
        if (classesRes.success) {
          const classes = classesRes.data || [];
          setDashboardData({
            lecturerName: localStorage.getItem('userName') || 'Lecturer',
            classes: classes,
            todayClasses: classes.filter(c => {
              const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              return c.day_of_week === today;
            }),
            pendingActions: [],
            summary: {
              totalClasses: classes.length,
              totalSessions: classes.reduce((sum, c) => sum + (c.total_sessions || 0), 0),
              totalStudents: classes.reduce((sum, c) => sum + (c.enrolled_students || 0), 0),
              todayAttendance: classes.reduce((sum, c) => sum + (c.today_attendance || 0), 0)
            }
          });
        } else {
          throw new Error('Failed to fetch dashboard data from database');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNotification = (msg) => setNotifications((s) => [msg, ...s]);

    socket.on('notification', handleNotification);
    socket.on('lecturer-session-started', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('lecturer-session-started', handleNotification);
    };
  }, [socketRef]);

  const overview = dashboardData; // The API already returns data in the correct format for LecturerOverview
  const classes = dashboardData.classes;
  const roster = []; // This might need to be fetched separately or added to dashboard endpoint

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">👨‍🏫 Lecturer Dashboard</h1>
            <p className="text-indigo-100 text-sm sm:text-base mt-1">Manage classes, attendance & student engagement</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs sm:text-sm font-medium backdrop-blur">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="px-3 py-1 rounded-full bg-green-500/30 text-xs sm:text-sm font-medium">
              ✓ Active
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 sm:p-4 md:p-5 bg-gradient-to-r from-red-50 to-red-100 text-red-800 rounded-xl border border-red-200 shadow-sm">
          <p className="font-semibold text-sm sm:text-base">⚠️ Connection Error</p>
          <p className="text-xs sm:text-sm mt-1">Failed to load dashboard data. Please check your server connection.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Top Section - Overview + Controls + QR */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="md:col-span-2 lg:col-span-2">
              <LecturerOverview data={overview} />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <LecturerControls classId={classes?.[0]?.id} onStart={()=>{}} onDelay={()=>{}} onCancel={()=>{}} onChangeRoom={()=>{}} />
              <LecturerQRDisplay token={overview.sessionToken} expiry={overview.sessionExpiry} onRotate={()=>{}} />
            </div>
          </div>

          {/* Bottom Section - Schedule + Roster + Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="md:col-span-2 lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
              <LecturerSchedulePanel classes={classes} />
              <RosterManagement roster={roster} />
            </div>
            <div className="space-y-3 sm:space-y-4">
              {/* Notifications Panel */}
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">📢</span>
                    Notifications
                  </h3>
                  {notifications.length > 0 && (
                    <span className="text-xs text-gray-600 mt-1">{notifications.length} new</span>
                  )}
                </div>
                <div className="p-3 sm:p-4 md:p-5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <p className="text-sm sm:text-base text-gray-500">No new notifications</p>
                      <p className="text-xs text-gray-400 mt-1">Stay tuned for updates</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto">
                      {notifications.map((n, i) => (
                        <div
                          key={i}
                          className="p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 text-xs sm:text-sm text-gray-700 hover:shadow-sm transition-shadow"
                        >
                          <p className="font-medium">{n.message || JSON.stringify(n)}</p>
                          <p className="text-gray-500 text-xs mt-1">Just now</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 text-white shadow-lg">
                <h3 className="text-sm font-bold text-indigo-100 uppercase tracking-wide">Session Status</h3>
                <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Session Token</span>
                    <span className="font-mono text-xs sm:text-sm bg-white/20 px-2 py-1 rounded">{overview.sessionToken || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Expiry</span>
                    <span className="font-bold text-sm sm:text-base">{overview.sessionExpiry || '00:10:00'}</span>
                  </div>
                  <div className="h-1.5 bg-white/30 rounded-full mt-3 overflow-hidden">
                    <div className="h-full w-3/4 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
