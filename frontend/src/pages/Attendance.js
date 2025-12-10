import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Attendance.css';
import QRScanner from '../components/QRScanner';

function Attendance() {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [showScanner, setShowScanner] = useState(false);
  const [classId, setClassId] = useState('1');
  const [sessionId, setSessionId] = useState('1');

  const attendanceData = {
    today: [
      { id: 1, class: 'Data Structures', time: '10:00 AM', status: 'Present', duration: '1h 30m' },
      { id: 2, class: 'Web Development', time: '11:30 AM', status: 'Present', duration: '1h 45m' },
      { id: 3, class: 'AI & ML', time: '2:00 PM', status: 'Pending', duration: '-' }
    ],
    week: [
      { date: 'Monday', present: 4, absent: 0, late: 1, total: 5, percentage: 80 },
      { date: 'Tuesday', present: 5, absent: 0, late: 0, total: 5, percentage: 100 },
      { date: 'Wednesday', present: 4, absent: 1, late: 0, total: 5, percentage: 80 },
      { date: 'Thursday', present: 5, absent: 0, late: 0, total: 5, percentage: 100 },
      { date: 'Friday', present: 4, absent: 0, late: 1, total: 5, percentage: 80 }
    ],
    month: [
      { week: 'Week 1', present: 22, absent: 2, late: 1, total: 25, percentage: 88 },
      { week: 'Week 2', present: 24, absent: 0, late: 1, total: 25, percentage: 96 },
      { week: 'Week 3', present: 23, absent: 1, late: 1, total: 25, percentage: 92 },
      { week: 'Week 4', present: 24, absent: 0, late: 1, total: 25, percentage: 96 }
    ]
  };

  const overallStats = {
    percentage: 91.5,
    present: 93,
    absent: 3,
    late: 4,
    total: 100
  };

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

      <div className="overall-stats">
        <div className="stat-box large">
          <div className="stat-label">Overall Attendance</div>
          <div className="stat-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <circle cx="50" cy="50" r="45" className="circle-fill" 
                style={{strokeDasharray: `${overallStats.percentage * 2.83} 283`}} />
            </svg>
            <div className="circle-text">
              <div className="percentage">{overallStats.percentage}%</div>
              <div className="label">Excellent</div>
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
        {activeTab === 'today' && (
          <div className="card">
            <h2>Today's Classes</h2>
            <div className="attendance-list">
              {attendanceData.today.map((item) => (
                <div key={item.id} className="attendance-item">
                  <div className="item-left">
                    <h3>{item.class}</h3>
                    <p>🕐 {item.time}</p>
                  </div>
                  <div className="item-middle">
                    <span className={`status-badge ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="item-right">
                    <p>{item.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'week' && (

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
          <div className="card">
            <h2>Weekly Attendance</h2>
            <div className="weekly-stats">
              {attendanceData.week.map((day, idx) => (
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

        {activeTab === 'month' && (
          <div className="card">
            <h2>Monthly Attendance</h2>
            <div className="monthly-stats">
              {attendanceData.month.map((week, idx) => (
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
