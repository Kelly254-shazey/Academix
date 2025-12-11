import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClasses: 0,
    presentClasses: 0,
    attendanceRate: 0,
    upcomingClasses: 0,
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch stats
      const statsRes = await fetch('/api/attendance/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
      }

      // Fetch classes
      const classesRes = await fetch('/api/class/my-classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const classesData = await classesRes.json();
      if (classesRes.ok) {
        setClasses(classesData);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    navigate('/qr-scanner');
  };

  const handleViewHistory = () => {
    navigate('/attendance-history');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Welcome, {user?.fullName || 'Student'}</h1>
          <p className="dashboard-subtitle">
            Your attendance dashboard for {new Date().getFullYear()}
          </p>
        </div>
        <button className="qr-scan-btn" onClick={handleQRScan}>
          📱 Scan QR Code
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <p className="stat-label">Total Classes</p>
            <p className="stat-value">{stats.totalClasses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <p className="stat-label">Present</p>
            <p className="stat-value">{stats.presentClasses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <p className="stat-label">Attendance Rate</p>
            <p className="stat-value">{stats.attendanceRate}%</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <p className="stat-label">Upcoming</p>
            <p className="stat-value">{stats.upcomingClasses}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            My Classes
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="info-card">
              <h3 className="card-title">📋 Your Profile</h3>
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{user?.fullName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user?.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Student ID:</span>
                  <span className="info-value">{user?.studentId || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Department:</span>
                  <span className="info-value">{user?.department || 'Not Set'}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3 className="card-title">🎯 Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={handleQRScan}>
                  <div className="action-icon">📱</div>
                  <div className="action-text">
                    <p className="action-title">Scan QR</p>
                    <p className="action-desc">Check in to class</p>
                  </div>
                </button>
                <button className="action-btn" onClick={handleViewHistory}>
                  <div className="action-icon">📅</div>
                  <div className="action-text">
                    <p className="action-title">History</p>
                    <p className="action-desc">View attendance</p>
                  </div>
                </button>
                <button className="action-btn">
                  <div className="action-icon">📊</div>
                  <div className="action-text">
                    <p className="action-title">Analytics</p>
                    <p className="action-desc">View insights</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <div className="classes-list">
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <div key={cls.id} className="class-item">
                    <div className="class-header">
                      <h4 className="class-name">{cls.courseName}</h4>
                      <span className={`class-status ${cls.attended ? 'present' : 'absent'}`}>
                        {cls.attended ? '✅ Present' : '❌ Absent'}
                      </span>
                    </div>
                    <div className="class-details">
                      <p className="class-detail">
                        <span className="detail-label">Lecturer:</span>
                        <span className="detail-value">{cls.lecturerName}</span>
                      </p>
                      <p className="class-detail">
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">
                          {new Date(cls.classTime).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p className="empty-icon">📚</p>
                  <p className="empty-text">No classes enrolled yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="info-card">
              <h3 className="card-title">⚙️ Settings</h3>
              <div className="settings-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <p className="setting-title">Email Notifications</p>
                    <p className="setting-desc">Receive attendance reminders</p>
                  </div>
                  <input type="checkbox" className="setting-toggle" defaultChecked />
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <p className="setting-title">Location Services</p>
                    <p className="setting-desc">Enable GPS for geo-fencing</p>
                  </div>
                  <input type="checkbox" className="setting-toggle" defaultChecked />
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <p className="setting-title">Dark Mode</p>
                    <p className="setting-desc">Use dark theme</p>
                  </div>
                  <input type="checkbox" className="setting-toggle" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
