import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const stats = [
    { label: 'Present Today', value: '100%', icon: '✅', color: '#2ed573' },
    { label: 'Classes', value: '5', icon: '📚', color: '#0984e3' },
    { label: 'Messages', value: '3', icon: '💬', color: '#ff7675' },
    { label: 'Assignments', value: '2', icon: '📝', color: '#fdcb6e' }
  ];

  const upcomingClasses = [
    { id: 1, name: 'Data Structures', instructor: 'Dr. Smith', time: '10:00 AM', room: 'A101' },
    { id: 2, name: 'Web Development', instructor: 'Prof. Johnson', time: '11:30 AM', room: 'B205' },
    { id: 3, name: 'AI & ML', instructor: 'Dr. Patel', time: '2:00 PM', room: 'C301' }
  ];

  const recentActivity = [
    { id: 1, event: 'Checked in to Data Structures', time: '9:55 AM', status: 'success' },
    { id: 2, event: 'New message from Dr. Smith', time: '8:30 AM', status: 'info' },
    { id: 3, event: 'Assignment submitted successfully', time: 'Yesterday', status: 'success' }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user.name}! 👋</h1>
        <p>Here's your attendance and class overview</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card upcoming-classes">
          <div className="card-header">
            <h2>📅 Today's Classes</h2>
            <button className="view-all">View All →</button>
          </div>
          <div className="classes-list">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="class-item">
                <div className="class-info">
                  <h3>{cls.name}</h3>
                  <p>📍 {cls.room} • 👨‍🏫 {cls.instructor}</p>
                </div>
                <div className="class-time">{cls.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card recent-activity">
          <div className="card-header">
            <h2>⏱️ Recent Activity</h2>
            <button className="view-all">View All →</button>
          </div>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className={`activity-item ${activity.status}`}>
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <p>{activity.event}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn">
            <span className="action-icon">📸</span>
            <span>Scan QR Code</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📊</span>
            <span>View Reports</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">🔔</span>
            <span>Notifications</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📞</span>
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
