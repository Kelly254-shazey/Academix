import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

const AttendanceHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        // Fetch attendance analytics via apiClient
        const data = await apiClient.get('/attendance-analytics/per-course');
        setAttendance(data.data || data || []);
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
