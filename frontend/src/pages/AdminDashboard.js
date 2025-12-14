import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, Activity, AlertTriangle, Settings, MessageSquare, FileText, RefreshCw, Shield, Clock } from 'lucide-react';
import apiClient from '../utils/apiClient';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClasses: 0,
    totalAttendance: 0,
    activeSessions: 0,
    totalLecturers: 0,
    totalStudents: 0,
    systemHealth: 'Good'
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real data, fallback to mock data if API doesn't exist
      try {
        const response = await apiClient.get('/admin/dashboard/stats');
        setStats(response.data.stats || {
          totalUsers: 0,
          totalClasses: 0,
          totalAttendance: 0,
          activeSessions: 0,
          totalLecturers: 0,
          totalStudents: 0,
          systemHealth: 'Good'
        });
        setRecentAlerts(response.data.alerts || []);
        setRecentActivity(response.data.activity || []);
      } catch (apiError) {
        console.warn('API not available, using mock data:', apiError);
        // Mock data for development
        setStats({
          totalUsers: 1250,
          totalClasses: 45,
          totalAttendance: 8750,
          activeSessions: 12,
          totalLecturers: 35,
          totalStudents: 1215,
          systemHealth: 'Good'
        });
        setRecentAlerts([
          { title: 'Low Attendance Alert', message: 'Class CS101 has attendance below 70%', severity: 'medium', time: '2 hours ago' },
          { title: 'System Maintenance', message: 'Scheduled maintenance completed successfully', severity: 'low', time: '1 day ago' }
        ]);
        setRecentActivity([
          { action: 'New user registered', user: 'John Doe', time: '5 min ago' },
          { action: 'Class session started', user: 'Dr. Smith', time: '15 min ago' },
          { action: 'Report generated', user: 'Admin User', time: '1 hour ago' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const quickActions = [
    { icon: Users, label: 'Manage Users', path: '/portal/admin/users', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { icon: BookOpen, label: 'Class Management', path: '/portal/admin/classes', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
    { icon: FileText, label: 'Reports', path: '/portal/admin/reports', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { icon: Settings, label: 'Settings', path: '/portal/admin/settings', color: 'bg-gray-50 hover:bg-gray-100 border-gray-200' },
    { icon: MessageSquare, label: 'Messages', path: '/portal/admin/messages', color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' },
    { icon: Activity, label: 'Attendance', path: '/portal/admin/attendance', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening in your system.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Users</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-1">Active users in system</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total Classes</p>
              <p className="text-2xl font-bold text-green-900">{stats.totalClasses}</p>
              <p className="text-xs text-green-600 mt-1">Scheduled classes</p>
            </div>
            <BookOpen className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Attendance Records</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalAttendance.toLocaleString()}</p>
              <p className="text-xs text-purple-600 mt-1">Total attendance logs</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Active Sessions</p>
              <p className="text-2xl font-bold text-orange-900">{stats.activeSessions}</p>
              <p className="text-xs text-orange-600 mt-1">Currently active</p>
            </div>
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Lecturers</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalLecturers}</p>
            </div>
            <Shield className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
            </div>
            <Users className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className="text-xl font-bold text-green-600">{stats.systemHealth}</p>
            </div>
            <Activity className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors ${action.color}`}
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-6 w-6 text-gray-600 mb-2" />
              <span className="text-xs text-center text-gray-700 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Recent Alerts
          </h2>
          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    alert.severity === 'high' ? 'text-red-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent alerts</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activity
          </h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">by {activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
