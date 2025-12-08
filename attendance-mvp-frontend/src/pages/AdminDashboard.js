import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAPI';
import '../styles/AdminDashboard.css';

/**
 * Admin Dashboard
 * Platform-wide analytics and statistics
 */
const AdminDashboard = () => {
  const { user } = useAuth();
  const { overview, getPlatformOverview } = useAnalytics();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        await getPlatformOverview();
      } catch (error) {
        console.error('Failed to fetch overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [getPlatformOverview]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🔐 Admin Dashboard</h1>
          <p>Platform Statistics & Control</p>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Platform Overview */}
        {overview && (
          <section className="overview-section">
            <h2>📊 Platform Overview</h2>
            <div className="stats-grid">
              <div className="stat-card large">
                <div className="stat-value">{overview.total_students || 0}</div>
                <div className="stat-label">👨‍🎓 Total Students</div>
              </div>
              <div className="stat-card large">
                <div className="stat-value">{overview.total_lecturers || 0}</div>
                <div className="stat-label">👨‍🏫 Total Lecturers</div>
              </div>
              <div className="stat-card large">
                <div className="stat-value">{overview.total_classes || 0}</div>
                <div className="stat-label">📚 Total Classes</div>
              </div>
              <div className="stat-card large">
                <div className="stat-value">{overview.overall_attendance_rate || 0}%</div>
                <div className="stat-label">📈 Avg Attendance Rate</div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="actions-section">
          <h2>⚙️ Admin Actions</h2>
          <div className="action-buttons">
            <button className="btn btn-action">👥 Manage Users</button>
            <button className="btn btn-action">📚 Manage Classes</button>
            <button className="btn btn-action">📊 View Reports</button>
            <button className="btn btn-action">🔔 Send Notifications</button>
            <button className="btn btn-action">⚙️ System Settings</button>
            <button className="btn btn-action">📥 Export Data</button>
          </div>
        </section>

        {/* System Info */}
        <section className="system-info">
          <h2>ℹ️ System Information</h2>
          <div className="info-card">
            <p><strong>Total Attendance Records:</strong> {overview.total_attendance_records || 0}</p>
            <p><strong>System Status:</strong> <span className="status-active">🟢 Operational</span></p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleString()}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
