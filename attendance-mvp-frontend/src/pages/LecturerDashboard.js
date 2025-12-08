import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useClasses, useAttendance, useAnalytics } from '../hooks/useAPI';
import '../styles/LecturerDashboard.css';

/**
 * Lecturer Dashboard
 * Shows lecturer's classes, enables attendance marking, and displays analytics
 */
const LecturerDashboard = () => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { classes, loading, getLecturerClasses } = useClasses();
  const { markAttendance } = useAttendance();
  const { overview, getLecturerOverview } = useAnalytics();
  const [selectedClass, setSelectedClass] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [formData, setFormData] = useState({ studentId: '', status: 'present', notes: '' });

  useEffect(() => {
    getLecturerClasses();
    getLecturerOverview();
  }, [getLecturerClasses, getLecturerOverview]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;

    try {
      await markAttendance(
        formData.studentId,
        selectedClass.id,
        formData.status,
        formData.notes
      );
      alert('✅ Attendance marked successfully');
      setFormData({ studentId: '', status: 'present', notes: '' });
      setShowAttendanceForm(false);
    } catch (error) {
      alert('❌ Failed to mark attendance: ' + error.message);
    }
  };

  return (
    <div className="lecturer-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>👨‍🏫 Lecturer Dashboard</h1>
          <p>Welcome, Prof. {user?.last_name}</p>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Overview Stats */}
        {overview && (
          <section className="stats-panel">
            <h2>📊 Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{overview.total_classes || 0}</h3>
                <p>Total Classes</p>
              </div>
              <div className="stat-card">
                <h3>{overview.total_students || 0}</h3>
                <p>Total Students</p>
              </div>
              <div className="stat-card">
                <h3>{overview.overall_attendance_rate || 0}%</h3>
                <p>Attendance Rate</p>
              </div>
              <div className="stat-card">
                <h3>{overview.total_attendance_records || 0}</h3>
                <p>Records Marked</p>
              </div>
            </div>
          </section>
        )}

        {/* My Classes */}
        <section className="classes-section">
          <h2>📚 My Classes ({classes.length})</h2>
          
          {loading ? (
            <p className="loading">Loading classes...</p>
          ) : (
            <div className="classes-list">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  className={`class-item ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                  onClick={() => setSelectedClass(cls)}
                >
                  <div className="class-info">
                    <h3>{cls.course_code}</h3>
                    <p>{cls.course_name}</p>
                  </div>
                  <button className="btn btn-small">Select</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attendance Marking */}
        {selectedClass && (
          <section className="attendance-section">
            <h2>✅ Mark Attendance - {selectedClass.course_code}</h2>
            
            {!showAttendanceForm ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowAttendanceForm(true)}
              >
                + Mark Attendance
              </button>
            ) : (
              <form onSubmit={handleMarkAttendance} className="attendance-form">
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="number"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="Enter student ID"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Mark</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAttendanceForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <section className="notifications-panel">
            <h2>🔔 Notifications ({notifications.length})</h2>
            <div className="notification-list">
              {notifications.slice(0, 3).map(notif => (
                <div key={notif.id} className={`notification-item ${notif.type}`}>
                  <h3>{notif.title}</h3>
                  <p>{notif.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
