import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  GraduationCap,
  Building,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Settings,
  BarChart3,
  Calendar,
  Shield
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLecturers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalDepartments: 0,
    totalClasses: 0,
    totalAttendanceRecords: 0,
    activeSessions: 0,
    todaySessions: 0,
    todayAttendance: 0,
    avgAttendanceToday: 0,
    lowAttendanceStudents: 0,
    unreadMessages: 0,
    systemAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all dashboard data in parallel from database
      const [
        statsResult,
        activityResult,
        trendsResult
      ] = await Promise.all([
        apiClient.get('/api/admin/overview'),
        apiClient.get('/api/admin/recent-activity'),
        apiClient.get('/api/admin/attendance-trends')
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      if (activityResult.success) {
        setRecentActivity(activityResult.data);
      }

      if (trendsResult.success) {
        setAttendanceTrends(trendsResult.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Lecturers',
      value: stats.totalLecturers,
      icon: UserCheck,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Admins',
      value: stats.totalAdmins,
      icon: Shield,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'Departments',
      value: stats.totalDepartments,
      icon: Building,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      title: 'Attendance Records',
      value: stats.totalAttendanceRecords,
      icon: TrendingUp,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700'
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions,
      icon: Calendar,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700'
    },
    {
      title: 'Today\'s Sessions',
      value: stats.todaySessions,
      icon: Calendar,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Today\'s Attendance',
      value: stats.todayAttendance,
      icon: TrendingUp,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700'
    },
    {
      title: 'Avg Attendance Today',
      value: `${stats.avgAttendanceToday}%`,
      icon: BarChart3,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      title: 'System Alerts',
      value: stats.systemAlerts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    }
  ];

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create lecturer or student accounts',
      icon: Users,
      path: '/portal/admin/users',
      color: 'bg-blue-500'
    },
    {
      title: 'Create Class',
      description: 'Set up new class sessions',
      icon: BookOpen,
      path: '/portal/admin/classes',
      color: 'bg-green-500'
    },
    {
      title: 'View Reports',
      description: 'Check attendance analytics',
      icon: BarChart3,
      path: '/portal/admin/reports',
      color: 'bg-purple-500'
    },
    {
      title: 'Manage Departments',
      description: 'Organize academic departments',
      icon: Building,
      path: '/portal/admin/departments',
      color: 'bg-orange-500'
    },
    {
      title: 'Messages',
      description: 'Check communications',
      icon: MessageSquare,
      path: '/portal/admin/messages',
      color: 'bg-yellow-500'
    },
    {
      title: 'Settings',
      description: 'Configure system preferences',
      icon: Settings,
      path: '/portal/admin/settings',
      color: 'bg-gray-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏛️ Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive university attendance management overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-indigo-600" />
          <span className="text-sm font-medium text-gray-600">Administrator Access</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-xl p-6 border border-gray-100`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${stat.textColor}`}>{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => window.location.href = action.path}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className={`${action.color} p-2 rounded-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Attendance Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Trends</h2>
          <div className="space-y-4">
            {attendanceTrends.length > 0 ? (
              attendanceTrends.slice(0, 5).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{trend.className}</p>
                    <p className="text-xs text-gray-500">{trend.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{trend.attendanceRate}%</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`h-3 w-3 ${trend.trend === 'up' ? 'text-green-500' : trend.trend === 'down' ? 'text-red-500' : 'text-gray-500'}`} />
                      <span className={`text-xs ${trend.trend === 'up' ? 'text-green-600' : trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No attendance data available</p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <h3 className="font-medium text-gray-900">Database</h3>
            <p className="text-sm text-gray-600">Operational</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <h3 className="font-medium text-gray-900">API Services</h3>
            <p className="text-sm text-gray-600">Running</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
            </div>
            <h3 className="font-medium text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Maintenance</p>
          </div>
        </div>
      </div>
    </div>
  );
}