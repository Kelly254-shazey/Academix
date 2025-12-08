/**
 * Student Dashboard Page
 */

import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrolled classes
      const classesRes = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (classesRes.ok) {
        setClasses(await classesRes.json());
      }

      // Fetch attendance for each class
      const classesData = await classesRes.json();
      for (const cls of classesData) {
        const attRes = await fetch(`/api/attendance/percentage/${cls.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (attRes.ok) {
          const data = await attRes.json();
          setAttendance((prev) => ({
            ...prev,
            [cls.id]: data.stats,
          }));

          // Fetch predictions
          const predRes = await fetch(`/api/ai/predict/absenteeism/${cls.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (predRes.ok) {
            const predData = await predRes.json();
            setPredictions((prev) => ({
              ...prev,
              [cls.id]: predData.prediction,
            }));
          }
        }
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name}!</h1>
        <p>Your attendance overview</p>
      </div>

      <div className="classes-grid">
        {classes.length === 0 ? (
          <div className="no-classes">
            <p>You are not enrolled in any classes yet.</p>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="class-card">
              <div className="class-header">
                <h3>{cls.course_name}</h3>
                <span className="course-code">{cls.course_code}</span>
              </div>

              <div className="class-info">
                <p>
                  <strong>Lecturer:</strong> {cls.lecturer_name}
                </p>
                <p>
                  <strong>Time:</strong> {cls.start_time} - {cls.end_time}
                </p>
                <p>
                  <strong>Location:</strong> {cls.location_name}
                </p>
              </div>

              {attendance[cls.id] && (
                <div className="attendance-stats">
                  <div className="stat">
                    <span className="label">Attendance Rate</span>
                    <span className={`value ${attendance[cls.id].attendance_percentage >= 75 ? 'good' : 'warning'}`}>
                      {attendance[cls.id].attendance_percentage}%
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Classes Attended</span>
                    <span className="value">{attendance[cls.id].attended_sessions} / {attendance[cls.id].total_sessions}</span>
                  </div>
                </div>
              )}

              {predictions[cls.id] && (
                <div className={`prediction-alert ${predictions[cls.id].risk_level}`}>
                  <span className="risk-badge">{predictions[cls.id].risk_level.toUpperCase()}</span>
                  <p>{predictions[cls.id].recommendation}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
