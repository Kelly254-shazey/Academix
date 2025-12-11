import React, { useState, useEffect } from 'react';
import './AttendanceAnalysis.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function AttendanceAnalysis() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysis, setAnalysis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);

  useEffect(() => {
    fetchAllData();
    // Refresh data every 5 seconds for real-time updates
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, alertsRes, messagesRes] = await Promise.all([
        fetch(`${API_URL}/feedback/analytics/realtime`),
        fetch(`${API_URL}/feedback/attendance/alerts`),
        fetch(`${API_URL}/feedback/anonymous-messages`)
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        // Use realtime analytics data
        const analysisData = {};
        Object.entries(data.students || {}).forEach(([studentId, studentData]) => {
          analysisData[studentId] = {
            ...studentData,
            status: studentData.status || 'Good'
          };
        });
        setAnalysis(analysisData);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setAnonymousMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      const response = await fetch(`${API_URL}/feedback/attendance/analysis/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudentDetails(data);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudent(studentId);
    fetchStudentDetails(studentId);
  };

  const markMessageAsReviewed = async (messageId) => {
    try {
      const response = await fetch(`${API_URL}/feedback/anonymous-messages/${messageId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Reviewed', actionTaken: 'noted' })
      });

      if (response.ok) {
        // Refresh messages
        const messagesRes = await fetch(`${API_URL}/feedback/anonymous-messages`);
        const data = await messagesRes.json();
        setAnonymousMessages(data.messages);
      }
    } catch (error) {
      console.error('Error marking message as reviewed:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading attendance data...</div>;
  }

  return (
    <div className="attendance-analysis-container">
      <div className="analysis-header">
        <h1>📊 Attendance Analysis Dashboard</h1>
        <p>Monitor student attendance and analyze patterns</p>
      </div>

      {/* Tabs */}
      <div className="analysis-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          ⚠️ Alerts ({alerts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
        </button>
        <button
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          💬 Anonymous Messages ({anonymousMessages.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="analysis-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && analysis && (
          <div className="overview-section">
            <h2>System Attendance Overview</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <h3>Total Students</h3>
                <p className="stat-number">{Object.keys(analysis).length}</p>
              </div>
              <div className="stat-box">
                <h3>Critical Attendance</h3>
                <p className="stat-number warning">
                  {Object.values(analysis).filter(a => a.status === 'Critical').length}
                </p>
              </div>
              <div className="stat-box">
                <h3>Good Standing</h3>
                <p className="stat-number success">
                  {Object.values(analysis).filter(a => a.status === 'Good').length}
                </p>
              </div>
              <div className="stat-box">
                <h3>Average Attendance</h3>
                <p className="stat-number">
                  {(Object.values(analysis).reduce((sum, a) => sum + a.attendancePercentage, 0) / Object.keys(analysis).length).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="student-performance">
              <h3>Student Performance Overview</h3>
              <div className="performance-list">
                {Object.entries(analysis).slice(0, 10).map(([studentId, data]) => (
                  <div key={studentId} className="performance-item">
                    <div className="item-info">
                      <span className="student-id">{studentId}</span>
                      <span className={`attendance-status ${data.status.toLowerCase()}`}>
                        {data.attendancePercentage}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress ${data.status.toLowerCase()}`}
                        style={{ width: `${data.attendancePercentage}%` }}
                      ></div>
                    </div>
                    <span className="attendance-details">
                      {data.present}/{data.total} Present
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <h2>⚠️ Attendance Alerts</h2>
            {alerts.length === 0 ? (
              <div className="empty-state">
                <p>✅ No attendance alerts. All students are maintaining good attendance.</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert, index) => (
                  <div key={index} className={`alert-item ${alert.severity.toLowerCase()}`}>
                    <div className="alert-header">
                      <h4>{alert.studentId}</h4>
                      <span className={`severity-badge ${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="alert-stats">
                      <span>{alert.attendancePercentage}% attendance</span>
                      <span>•</span>
                      <span>{alert.present}/{alert.total} present</span>
                      <span>•</span>
                      <span>{alert.absent} absences</span>
                    </div>
                    <p className="alert-message">{alert.message}</p>
                    <button 
                      className="btn-contact"
                      onClick={() => handleSelectStudent(alert.studentId)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="students-section">
            <h2>Student Attendance Details</h2>

            <div className="search-bar">
              <input
                type="text"
                placeholder="Search student ID..."
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              />
            </div>

            {selectedStudent && studentDetails ? (
              <div className="student-detail-view">
                <button className="btn-back" onClick={() => setSelectedStudent(null)}>
                  ← Back to List
                </button>
                
                <div className="detail-header">
                  <h3>{studentDetails.studentId}</h3>
                </div>

                <div className="detail-stats">
                  <div className="detail-stat">
                    <span>Total Classes</span>
                    <p>{studentDetails.analysis.total}</p>
                  </div>
                  <div className="detail-stat">
                    <span>Present</span>
                    <p className="success">{studentDetails.analysis.present}</p>
                  </div>
                  <div className="detail-stat">
                    <span>Absent</span>
                    <p className="danger">{studentDetails.analysis.absent}</p>
                  </div>
                  <div className="detail-stat">
                    <span>Late</span>
                    <p className="warning">{studentDetails.analysis.late}</p>
                  </div>
                  <div className="detail-stat">
                    <span>Excused</span>
                    <p>{studentDetails.analysis.excused}</p>
                  </div>
                </div>

                <div className="detail-percentage">
                  <h4>Overall Attendance: {studentDetails.analysis.attendancePercentage}%</h4>
                  <div className="percentage-bar">
                    <div
                      className={`percentage-fill ${studentDetails.analysis.status.toLowerCase()}`}
                      style={{ width: `${studentDetails.analysis.attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>

                {Object.keys(studentDetails.courseAnalysis).length > 0 && (
                  <div className="course-breakdown">
                    <h4>Attendance by Course</h4>
                    <div className="courses-grid">
                      {Object.entries(studentDetails.courseAnalysis).map(([course, data]) => (
                        <div key={course} className="course-item">
                          <h5>{course}</h5>
                          <p>{data.present}/{data.total} ({data.percentage}%)</p>
                          <div className="mini-progress">
                            <div
                              className="mini-fill"
                              style={{ width: `${data.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentDetails.records.length > 0 && (
                  <div className="attendance-records">
                    <h4>Recent Attendance Records</h4>
                    <div className="records-table">
                      <div className="table-header">
                        <div>Date</div>
                        <div>Course</div>
                        <div>Status</div>
                      </div>
                      {studentDetails.records.slice(0, 10).map((record, idx) => (
                        <div key={idx} className="table-row">
                          <div>{record.date}</div>
                          <div>{record.courseName}</div>
                          <div className={`status-badge ${record.status}`}>
                            {record.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="students-list">
                {analysis && Object.entries(analysis)
                  .filter(([id]) => id.includes(courseFilter.toLowerCase()))
                  .slice(0, 20)
                  .map(([studentId, data]) => (
                    <div
                      key={studentId}
                      className="student-list-item"
                      onClick={() => handleSelectStudent(studentId)}
                    >
                      <div className="item-left">
                        <h4>{studentId}</h4>
                        <p>{data.present}/{data.total} present</p>
                      </div>
                      <div className="item-right">
                        <p className={`attendance-percent ${data.status.toLowerCase()}`}>
                          {data.attendancePercentage}%
                        </p>
                        <span className={`status-badge ${data.status.toLowerCase()}`}>
                          {data.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="messages-section">
            <h2>💬 Anonymous Feedback Messages</h2>
            {anonymousMessages.length === 0 ? (
              <div className="empty-state">
                <p>No anonymous messages submitted yet.</p>
              </div>
            ) : (
              <div className="messages-list">
                {anonymousMessages.map((msg, index) => (
                  <div key={index} className={`message-card ${msg.status}`}>
                    <div className="message-header">
                      <div>
                        <h4>{msg.courseName}</h4>
                        <p className="message-meta">
                          {msg.studentName} • {new Date(msg.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`message-status ${msg.status}`}>
                        {msg.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="message-content">
                      <h5>Reason for Absence:</h5>
                      <p>{msg.reason}</p>
                    </div>

                    <div className="message-footer">
                      {msg.status === 'unread' && (
                        <button
                          className="btn-review"
                          onClick={() => markMessageAsReviewed(msg.id)}
                        >
                          Mark as Reviewed
                        </button>
                      )}
                      {msg.status === 'reviewed' && msg.adminNotes && (
                        <div className="admin-notes">
                          <strong>Admin Notes:</strong> {msg.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceAnalysis;
