import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useClasses } from '../hooks/useAPI';
import '../styles/StudentDashboard.css';

/**
 * Student Dashboard
 * Shows student's enrolled classes, attendance records, and notifications
 */
const StudentDashboard = () => {
  const { user } = useAuth();
  const { notifications, clearNotification } = useNotifications();
  const { classes, loading, getStudentClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    getStudentClasses();
  }, [getStudentClasses]);

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>👨‍🎓 Student Dashboard</h1>
          <p>Welcome, {user?.first_name} {user?.last_name}</p>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <section className="notifications-panel">
            <h2>🔔 Recent Notifications ({notifications.length})</h2>
            <div className="notification-list">
              {notifications.slice(0, 5).map(notif => (
                <div key={notif.id} className={`notification-item ${notif.type}`}>
                  <div className="notification-content">
                    <h3>{notif.title}</h3>
                    <p>{notif.message}</p>
                    <small>{new Date(notif.timestamp).toLocaleString()}</small>
                  </div>
                  <button onClick={() => clearNotification(notif.id)}>✕</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Enrolled Classes */}
        <section className="classes-section">
          <h2>📚 My Classes ({classes.length})</h2>
          
          {loading ? (
            <p className="loading">Loading classes...</p>
          ) : classes.length === 0 ? (
            <p className="empty-message">You are not enrolled in any classes yet.</p>
          ) : (
            <div className="classes-grid">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  className={`class-card ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                  onClick={() => setSelectedClass(cls)}
                >
                  <h3>{cls.course_code}</h3>
                  <p className="course-name">{cls.course_name}</p>
                  <p className="lecturer">
                    📌 {cls.lecturer_first_name} {cls.lecturer_last_name}
                  </p>
                  <div className="class-info">
                    <span className="unit">{cls.unit_code}</span>
                    <span className="semester">Sem {cls.semester}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Class Details */}
        {selectedClass && (
          <section className="class-details">
            <h2>📖 {selectedClass.course_code} Details</h2>
            <div className="details-card">
              <h3>{selectedClass.course_name}</h3>
              <p><strong>Lecturer:</strong> {selectedClass.lecturer_first_name} {selectedClass.lecturer_last_name}</p>
              <p><strong>Unit Code:</strong> {selectedClass.unit_code}</p>
              <p><strong>Semester:</strong> {selectedClass.semester}</p>
              
              {selectedClass.schedules && selectedClass.schedules.length > 0 && (
                <div className="schedule-list">
                  <h4>📅 Schedule</h4>
                  {selectedClass.schedules.map((schedule, idx) => (
                    <div key={idx} className="schedule-item">
                      <span>{schedule.day_of_week}</span>
                      <span>{schedule.start_time} - {schedule.end_time}</span>
                      <span>Room {schedule.room_number}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-secondary">View Attendance Record</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
