import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import './Attendance.css';
import QRScanner from '../components/QRScanner';

function Attendance() {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [showScanner, setShowScanner] = useState(false);
  const [classId, setClassId] = useState('1');
  const [sessionId, setSessionId] = useState('1');

  const [attendanceToday, setAttendanceToday] = useState([]);
  const [attendanceWeek, setAttendanceWeek] = useState([]);
  const [attendanceMonth, setAttendanceMonth] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch today's scheduled classes (used to list today's entries)
        const schedJson = await apiClient.get('/schedule/today');
        const todayClasses = schedJson?.data || [];

        // Fetch overall attendance analytics
        const attendanceJson = await apiClient.get('/attendance-analytics/overall');
        const overall = attendanceJson?.data?.overall ?? null;

        if (!mounted) return;
        setAttendanceToday(todayClasses);
        setOverallStats(overall);
        // week/month breakdowns may not be available from backend; set empty arrays for now
        setAttendanceWeek([]);
        setAttendanceMonth([]);
      } catch (err) {
        console.error('Error loading attendance:', err);
        if (mounted) setError('Failed to load attendance data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [user]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Present':
        return 'success';
      case 'Absent':
        return 'danger';
      case 'Late':
        return 'warning';
      default:
        return 'pending';
    }
  };

  return (
    <div className="attendance">
      <div className="attendance-header">
        <h1>📊 Attendance Overview</h1>
        <p>Track your class attendance and statistics</p>
      </div>

      {error && <div className="error-alert" style={{margin: '12px 0'}}>{error}</div>}

      <div className="overall-stats">
        <div className="stat-box large">
          <div className="stat-label">Overall Attendance</div>
          <div className="stat-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <circle cx="50" cy="50" r="45" className="circle-fill" 
                style={{strokeDasharray: `${(overallStats?.percentage || 0) * 2.83} 283`}} />
            </svg>
            <div className="circle-text">
              <div className="percentage">{overallStats?.percentage ?? 0}%</div>
              <div className="label">{overallStats ? 'Current' : 'No data'}</div>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">✅ Present</div>
          <div className="stat-value">{overallStats.present}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">❌ Absent</div>
          <div className="stat-value">{overallStats.absent}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">⏰ Late</div>
          <div className="stat-value">{overallStats.late}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">📈 Total</div>
          <div className="stat-value">{overallStats.total}</div>
        </div>
      </div>

      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button 
          className={`tab-btn ${activeTab === 'week' ? 'active' : ''}`}
          onClick={() => setActiveTab('week')}
        >
          This Week
        </button>
        <button 
          className={`tab-btn ${activeTab === 'month' ? 'active' : ''}`}
          onClick={() => setActiveTab('month')}
        >
          This Month
        </button>
        <button
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab('scan')}
        >
          Scan
        </button>
      </div>

      <div className="attendance-content">
        {loading && <div className="card"><p>Loading attendance...</p></div>}

        {activeTab === 'today' && !loading && (
          <div className="card">
            <h2>Today's Classes</h2>
            <div className="attendance-list">
              {attendanceToday.length === 0 && <div className="muted">No classes found for today.</div>}
              {attendanceToday.map((item, idx) => (
                <div key={item.id || idx} className="attendance-item">
                  <div className="item-left">
                    <h3>{item.course_name || item.class_name || item.name || 'Class'}</h3>
                    <p>🕐 {item.start_time || item.time || '—'}</p>
                  </div>
                  <div className="item-middle">
                    <span className={`status-badge ${getStatusColor(item.status || item.attendance_status || 'Pending')}`}>
                      {item.status || item.attendance_status || 'Pending'}
                    </span>
                  </div>
                  <div className="item-right">
                    <p>{item.duration || item.length || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'week' && (
          <div className="card">
            <h2>Weekly Attendance</h2>
            <div className="weekly-stats">
              {attendanceWeek.length === 0 && <div className="muted">Weekly attendance data not available.</div>}
              {attendanceWeek.map((day, idx) => (
                <div key={idx} className="day-stat">
                  <div className="day-header">{day.date}</div>
                  <div className="day-bar">
                    <div className="bar-segment present" 
                      style={{width: `${(day.present/day.total)*100}%`}}
                      title={`Present: ${day.present}`}
                    ></div>
                    <div className="bar-segment late" 
                      style={{width: `${(day.late/day.total)*100}%`}}
                      title={`Late: ${day.late}`}
                    ></div>
                    <div className="bar-segment absent" 
                      style={{width: `${(day.absent/day.total)*100}%`}}
                      title={`Absent: ${day.absent}`}
                    ></div>
                  </div>
                  <div className="day-percentage">{day.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="card">
            <h2>Scan QR for Attendance</h2>
            <div style={{ marginBottom: 12 }}>
              <label>Class ID: </label>
              <input value={classId} onChange={(e)=>setClassId(e.target.value)} />
              <label style={{ marginLeft: 12 }}>Session ID: </label>
              <input value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
              <button style={{ marginLeft: 12 }} onClick={()=>setShowScanner(s => !s)}>
                {showScanner ? 'Stop Scanner' : 'Start Scanner'}
              </button>
            </div>
            {showScanner && (
              <QRScanner classId={classId} sessionId={sessionId} onSuccess={(data)=>{ alert('Attendance recorded'); }} />
            )}
          </div>
        )}

        {activeTab === 'month' && (
          <div className="card">
            <h2>Monthly Attendance</h2>
            <div className="monthly-stats">
              {attendanceMonth.length === 0 && <div className="muted">Monthly attendance data not available.</div>}
              {attendanceMonth.map((week, idx) => (
                <div key={idx} className="week-stat">
                  <div className="week-header">
                    <span>{week.week}</span>
                    <span className="week-percentage">{week.percentage}%</span>
                  </div>
                  <div className="week-details">
                    <div className="detail">
                      <span className="detail-label">✅ Present</span>
                      <span className="detail-value present-color">{week.present}/{week.total}</span>
                    </div>
                    <div className="detail">
                      <span className="detail-label">❌ Absent</span>
                      <span className="detail-value absent-color">{week.absent}/{week.total}</span>
                    </div>
                    <div className="detail">
                      <span className="detail-label">⏰ Late</span>
                      <span className="detail-value late-color">{week.late}/{week.total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;
