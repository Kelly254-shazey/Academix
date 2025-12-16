import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient';

export default function AttendanceHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ course: '', dateRange: '' });

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.course) params.append('course', filter.course);
      if (filter.dateRange) params.append('dateRange', filter.dateRange);

      const data = await apiClient.get(`/attendance/history?${params}`);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const groupedHistory = history.reduce((acc, record) => {
    const date = new Date(record.date).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold mb-4">Attendance History</h2>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.course}
          onChange={(e) => setFilter({ ...filter, course: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Courses</option>
          {/* Add course options */}
        </select>
        <input
          type="date"
          value={filter.dateRange}
          onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([date, records]) => (
            <div key={date} className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-2">{date}</h3>
              <div className="space-y-2">
                {records.map((record, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{record.course_name}</p>
                      <p className="text-sm text-gray-600">{record.lecturer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${record.status === 'present' ? 'text-green-600' : 'text-red-600'}`}>
                        {record.status === 'present' ? 'Present' : 'Absent'}
                      </p>
                      <p className="text-sm text-gray-600">{record.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}