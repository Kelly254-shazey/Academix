import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalLecturers: 0,
    totalAdmins: 0,
    activeUsers: 0
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchAllData();
    // Refresh data every 10 seconds for real-time updates
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        fetch('http://localhost:5000/auth/demo-users'),
        fetch('http://localhost:5000/feedback/analytics/realtime')
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        const userList = data.users || [];
        setUsers(userList);

        const stats = {
          totalUsers: userList.length,
          totalStudents: userList.filter(u => u.role === 'student').length,
          totalLecturers: userList.filter(u => u.role === 'lecturer').length,
          totalAdmins: userList.filter(u => u.role === 'admin').length,
          activeUsers: userList.length
        };
        setStats(stats);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalyticsData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'student':
        return '👨‍🎓';
      case 'lecturer':
        return '👨‍🏫';
      case 'admin':
        return '👨‍💼';
      default:
        return '👤';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <h2>Access Denied</h2>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>System Administration & Monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <h3>Students</h3>
            <p className="stat-value">{stats.totalStudents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>Lecturers</h3>
            <p className="stat-value">{stats.totalLecturers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👨‍💼</div>
          <div className="stat-content">
            <h3>Admins</h3>
            <p className="stat-value">{stats.totalAdmins}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>Active Users</h3>
            <p className="stat-value">{stats.activeUsers}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab-button ${selectedTab === 'settings' ? 'active' : ''}`}
          onClick={() => setSelectedTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {selectedTab === 'overview' && (
          <div className="overview-section">
            <h2>System Overview</h2>
            {analyticsData && (
              <div className="analytics-refresh">
                <span>⟳ Real-time data</span>
                {lastUpdated && (
                  <span className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                )}
              </div>
            )}
            <div className="overview-grid">
              <div className="overview-card">
                <h3>System Status</h3>
                <p className="status-indicator">🟢 Online</p>
                <p className="status-text">All systems operational</p>
              </div>

              <div className="overview-card">
                <h3>Database</h3>
                <p className="status-indicator">🟢 Connected</p>
                <p className="status-text">In-memory database (Demo)</p>
              </div>

              <div className="overview-card">
                <h3>WebSocket</h3>
                <p className="status-indicator">🟢 Active</p>
                <p className="status-text">Real-time communication</p>
              </div>

              <div className="overview-card">
                <h3>API Health</h3>
                <p className="status-indicator">🟢 Healthy</p>
                <p className="status-text">All endpoints responsive</p>
              </div>
            </div>

            {/* Real-time Attendance Analytics */}
            {analyticsData?.systemStats && (
              <div className="analytics-section">
                <h3>📊 Real-Time Attendance Analytics</h3>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h4>Overall Attendance</h4>
                    <p className="analytics-value">{analyticsData.systemStats.overallAttendancePercentage}%</p>
                    <p className="analytics-label">System-wide average</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Total Students</h4>
                    <p className="analytics-value">{analyticsData.systemStats.totalStudents}</p>
                    <p className="analytics-label">Enrolled students</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Present Today</h4>
                    <p className="analytics-value success">{analyticsData.systemStats.presentCount}</p>
                    <p className="analytics-label">Attendance records</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Absent</h4>
                    <p className="analytics-value warning">{analyticsData.systemStats.absentCount}</p>
                    <p className="analytics-label">Absence records</p>
                  </div>

                  <div className="analytics-card">
                    <h4>At Risk</h4>
                    <p className="analytics-value danger">{analyticsData.systemStats.criticalStudents}</p>
                    <p className="analytics-label">Critical status</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Warning</h4>
                    <p className="analytics-value warning">{analyticsData.systemStats.warningStudents}</p>
                    <p className="analytics-label">Medium risk</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Excellent</h4>
                    <p className="analytics-value success">{analyticsData.systemStats.excellentStudents}</p>
                    <p className="analytics-label">High performers</p>
                  </div>

                  <div className="analytics-card">
                    <h4>Total Courses</h4>
                    <p className="analytics-value">{analyticsData.systemStats.totalCourses}</p>
                    <p className="analytics-label">Active courses</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overview-features">
              <h3>Enabled Features</h3>
              <ul className="features-list">
                <li>✅ Multi-role Authentication (Student, Lecturer, Admin)</li>
                <li>✅ Real-time Notifications via WebSocket</li>
                <li>✅ Real-time Attendance Analytics</li>
                <li>✅ JWT Token-based Sessions</li>
                <li>✅ Role-based Access Control</li>
                <li>✅ QR Code Attendance Tracking</li>
                <li>✅ AI-powered Analytics</li>
                <li>✅ Push Notifications</li>
              </ul>
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="users-section">
            <h2>User Management</h2>
            {loading ? (
              <p className="loading">Loading users...</p>
            ) : (
              <div className="users-list">
                {users.map((userData, index) => (
                  <div key={index} className="user-card">
                    <div className="user-avatar">{getRoleIcon(userData.role)}</div>
                    <div className="user-info">
                      <h4>{userData.name}</h4>
                      <p className="user-email">{userData.email}</p>
                      <p className="user-role">{userData.role.toUpperCase()}</p>
                    </div>
                    <div className="user-actions">
                      <button className="btn-action">Edit</button>
                      <button className="btn-action danger">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="settings-section">
            <h2>System Settings</h2>
            <div className="settings-form">
              <div className="setting-item">
                <label>System Name</label>
                <input type="text" value="ClassTrack AI" readOnly />
              </div>

              <div className="setting-item">
                <label>Database Type</label>
                <input type="text" value="In-Memory (Demo)" readOnly />
              </div>

              <div className="setting-item">
                <label>Backend Port</label>
                <input type="text" value="5000" readOnly />
              </div>

              <div className="setting-item">
                <label>Frontend Port</label>
                <input type="text" value="3000" readOnly />
              </div>

              <div className="setting-item">
                <label>JWT Expiry</label>
                <input type="text" value="24 hours" readOnly />
              </div>

              <div className="setting-item">
                <label>WebSocket Status</label>
                <div className="status-badge">🟢 Active</div>
              </div>

              <button className="btn-primary">Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
