import React, { useState, useEffect } from 'react';
import './Analytics.css';

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [courseData, setCourseData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:5000/feedback/analytics/realtime');
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        if (data.courses && Array.isArray(data.courses)) {
          setCourseData(data.courses);
        } else {
          setCourseData([]);
        }
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analyticsData) {
    return <div className="analytics-loading">Loading real-time analytics...</div>;
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📊 Real-Time Analytics Dashboard</h1>
        <p>Live attendance and performance metrics</p>
        {lastUpdated && (
          <div className="update-indicator">
            ⟳ Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* View Selector */}
      <div className="view-selector">
        <button
          className={`view-btn ${selectedView === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedView('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`view-btn ${selectedView === 'courses' ? 'active' : ''}`}
          onClick={() => setSelectedView('courses')}
        >
          📚 Courses
        </button>
        <button
          className={`view-btn ${selectedView === 'students' ? 'active' : ''}`}
          onClick={() => setSelectedView('students')}
        >
          👥 Students
        </button>
        <button
          className={`view-btn ${selectedView === 'trends' ? 'active' : ''}`}
          onClick={() => setSelectedView('trends')}
        >
          📉 Trends
        </button>
      </div>

      {/* Content */}
      <div className="analytics-content">
        {selectedView === 'overview' && analyticsData?.systemStats && (
          <div className="overview-view">
            <h2>System Overview</h2>
            
            <div className="key-metrics">
              <div className="metric-card primary">
                <div className="metric-icon">📊</div>
                <div className="metric-info">
                  <h3>Overall Attendance</h3>
                  <p className="metric-value">{analyticsData.systemStats.overallAttendancePercentage}%</p>
                  <p className="metric-detail">System-wide average</p>
                </div>
              </div>

              <div className="metric-card info">
                <div className="metric-icon">👥</div>
                <div className="metric-info">
                  <h3>Total Students</h3>
                  <p className="metric-value">{analyticsData.systemStats.totalStudents}</p>
                  <p className="metric-detail">Active students</p>
                </div>
              </div>

              <div className="metric-card success">
                <div className="metric-icon">✓</div>
                <div className="metric-info">
                  <h3>Present</h3>
                  <p className="metric-value">{analyticsData.systemStats.presentCount}</p>
                  <p className="metric-detail">Today's attendance</p>
                </div>
              </div>

              <div className="metric-card warning">
                <div className="metric-icon">⚠️</div>
                <div className="metric-info">
                  <h3>Absent</h3>
                  <p className="metric-value">{analyticsData.systemStats.absentCount}</p>
                  <p className="metric-detail">Today's absences</p>
                </div>
              </div>
            </div>

            <div className="status-breakdown">
              <h3>Student Status Distribution</h3>
              <div className="status-grid">
                <div className="status-item excellent">
                  <p className="status-count">{analyticsData.systemStats.excellentStudents}</p>
                  <p className="status-label">Excellent (80%+)</p>
                </div>
                <div className="status-item good">
                  <p className="status-count">
                    {(analyticsData.systemStats.totalStudents - 
                     analyticsData.systemStats.excellentStudents - 
                     analyticsData.systemStats.warningStudents - 
                     analyticsData.systemStats.criticalStudents)}
                  </p>
                  <p className="status-label">Good (60-79%)</p>
                </div>
                <div className="status-item warning">
                  <p className="status-count">{analyticsData.systemStats.warningStudents}</p>
                  <p className="status-label">Warning (40-59%)</p>
                </div>
                <div className="status-item critical">
                  <p className="status-count">{analyticsData.systemStats.criticalStudents}</p>
                  <p className="status-label">Critical (&lt;40%)</p>
                </div>
              </div>
            </div>

            <div className="course-stats">
              <h3>Course Statistics</h3>
              <p className="course-count">Total Courses: <strong>{analyticsData.systemStats.totalCourses}</strong></p>
              <p className="total-records">Total Attendance Records: <strong>{analyticsData.systemStats.totalAttendanceRecords}</strong></p>
            </div>
          </div>
        )}

        {selectedView === 'courses' && analyticsData?.courses && analyticsData.courses.length > 0 && (
          <div className="courses-view">
            <h2>Course Analytics</h2>
            <div className="courses-grid">
              {analyticsData.courses.map((course, idx) => (
                <div key={idx} className="course-card">
                  <h4>{course.courseName}</h4>
                  <div className="course-stat">
                    <span className="stat-label">Avg Attendance:</span>
                    <span className={`stat-value ${parseFloat(course.avgAttendance) >= 80 ? 'success' : parseFloat(course.avgAttendance) >= 60 ? 'warning' : 'danger'}`}>
                      {course.avgAttendance}%
                    </span>
                  </div>
                  <div className="course-stat">
                    <span className="stat-label">Total Classes:</span>
                    <span className="stat-value">{course.totalClasses}</span>
                  </div>
                  <div className="course-stat">
                    <span className="stat-label">Total Students:</span>
                    <span className="stat-value">{course.totalStudents}</span>
                  </div>
                  <div className="course-breakdown">
                    <p>✓ Present: {course.presentCount}</p>
                    <p>✗ Absent: {course.absentCount}</p>
                    <p>⏱ Late: {course.lateCount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedView === 'courses' && (!analyticsData?.courses || analyticsData.courses.length === 0) && (
          <div className="courses-view">
            <p className="no-data">No course data available</p>
          </div>
        )}

        {selectedView === 'students' && analyticsData?.students && Object.keys(analyticsData.students).length > 0 && (
          <div className="students-view">
            <h2>Student Analytics</h2>
            <div className="students-list">
              {Object.entries(analyticsData.students).map(([studentId, data]) => (
                <div key={studentId} className={`student-row ${data.risk || 'low'}`}>
                  <div className="student-info">
                    <p className="student-id">{studentId}</p>
                    <p className="student-status">{data.status || 'Unknown'}</p>
                  </div>
                  <div className="student-stats">
                    <span>Classes: {data.totalClasses || 0}</span>
                    <span>Present: {data.present || 0}</span>
                    <span>Absent: {data.absent || 0}</span>
                  </div>
                  <div className="student-attendance">
                    <div className="attendance-bar">
                      <div 
                        className="attendance-fill"
                        style={{ 
                          width: `${parseFloat(data.attendancePercentage) || 0}%`,
                          backgroundColor: parseFloat(data.attendancePercentage) >= 80 ? '#4caf50' : 
                                          parseFloat(data.attendancePercentage) >= 60 ? '#ff9800' : '#f44336'
                        }}
                      />
                    </div>
                    <span className="attendance-percent">{data.attendancePercentage || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedView === 'students' && (!analyticsData?.students || Object.keys(analyticsData.students).length === 0) && (
          <div className="students-view">
            <p className="no-data">No student data available</p>
          </div>
        )}

        {selectedView === 'trends' && analyticsData?.attendanceTrends && analyticsData.attendanceTrends.length > 0 && (
          <div className="trends-view">
            <h2>Attendance Trends (Last 7 Days)</h2>
            <div className="trends-chart">
              <table className="trends-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.attendanceTrends.map((trend, idx) => (
                    <tr key={idx}>
                      <td>{trend.date}</td>
                      <td>{trend.total}</td>
                      <td className="success">{trend.present}</td>
                      <td className="danger">{trend.absent}</td>
                      <td className="warning">{trend.late}</td>
                      <td>
                        <strong>
                          {trend.total > 0 ? ((trend.present / trend.total) * 100).toFixed(1) : 0}%
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedView === 'trends' && (!analyticsData?.attendanceTrends || analyticsData.attendanceTrends.length === 0) && (
          <div className="trends-view">
            <p className="no-data">No trend data available</p>
          </div>
        )}
      </div>

      {/* Message Count */}
      {analyticsData?.anonymousMessages && (
        <div className="messages-summary">
          <p>📬 Anonymous Messages: <strong>{analyticsData.anonymousMessages.total}</strong></p>
          <p>📖 Reviewed: <strong>{analyticsData.anonymousMessages.reviewed}</strong></p>
          <p>📌 Pending: <strong>{analyticsData.anonymousMessages.unreviewed}</strong></p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
