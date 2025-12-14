import React, { useEffect, useState, useCallback } from 'react';
import { Download, Filter, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import apiClient from '../../utils/apiClient';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [classes, setClasses] = useState([]);

  const fetchClasses = async () => {
    try {
      const result = await apiClient.get('/api/lecturer/classes');
      if (result.success) {
        setClasses(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes from database: ' + err.message);
    }
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('classId', selectedClass);
      params.append('dateRange', dateRange);

      const result = await apiClient.get(`/api/lecturer/reports?${params.toString()}`);
      if (result.success) {
        // Report data retrieved
      } else {
        throw new Error(result.message || 'Failed to fetch reports from database');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, dateRange]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const attendanceData = [
    { name: 'Present', value: 75, percentage: 75 },
    { name: 'Absent', value: 15, percentage: 15 },
    { name: 'Late', value: 10, percentage: 10 }
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  const classWiseAttendance = classes.map(cls => ({
    name: cls.course_code,
    attendance: Math.floor(Math.random() * 30) + 70,
    sessions: Math.floor(Math.random() * 15) + 10
  }));

  const attendanceTrend = [
    { date: 'Week 1', attendance: 78 },
    { date: 'Week 2', attendance: 82 },
    { date: 'Week 3', attendance: 75 },
    { date: 'Week 4', attendance: 88 }
  ];

  const handleExport = async () => {
    try {
      const result = await apiClient.get(`/api/lecturer/reports/export?format=csv&dateRange=${dateRange}`);
      if (result.success) {
        const link = document.createElement('a');
        link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(result.data)}`;
        link.download = `lecturer-reports-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">📊 Reports & Analytics</h1>
            <p className="text-indigo-100 mt-1">View attendance and performance metrics</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-2" />
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.course_code} - {cls.course_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <TrendingUp className="inline h-4 w-4 mr-2" />
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="semester">This Semester</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <p className="font-semibold">Error loading reports</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600" />
            Attendance Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Class-wise Attendance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Class-wise Attendance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classWiseAttendance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendance" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Attendance Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Attendance', value: '81%', icon: '📊', color: 'blue' },
          { label: 'Total Sessions', value: '48', icon: '📅', color: 'green' },
          { label: 'Total Students', value: '287', icon: '👥', color: 'purple' },
          { label: 'Attendance Trend', value: '↑ 5%', icon: '📈', color: 'yellow' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-lg mt-2">{stat.icon}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
