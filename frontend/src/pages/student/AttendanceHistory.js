import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const AttendanceHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch attendance analytics
        const response = await fetch(`${API_URL}/attendance-analytics/per-course`, { headers });
        if (response.ok) {
          const data = await response.json();
          setAttendance(data.data || []);
        } else {
          setError('Failed to fetch attendance data');
        }
      } catch (err) {
        setError('Error fetching attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Attendance History</h1>
      <div className="space-y-4">
        {attendance.map((item) => (
          <div key={item.id} className="border rounded p-4">
            <h2 className="font-semibold">{item.course_name || item.name}</h2>
            <p>Attendance: {item.attendance_percent || item.percentage}%</p>
            <p>Present: {item.attended || 0} / Total: {item.total_sessions || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceHistory;
