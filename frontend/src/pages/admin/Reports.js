import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

const Reports = () => {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('attendance');

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin dashboard overview
      const overviewResponse = await apiClient.get('/api/admin/overview');
      if (overviewResponse.success) {
        setSummary(overviewResponse.data);
      }

      // Fetch admin reports
      const reportsResponse = await apiClient.get('/api/admin/reports?type=overview');
      if (reportsResponse.success) {
        setInsights(reportsResponse.data);
      }

      // Use reports data as trends if available
      if (reportsResponse.success && reportsResponse.data) {
        setAttendanceTrends([
          { date: new Date().toISOString(), present: reportsResponse.data?.attendance?.verified || 0 }
        ]);
      }

    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (type) => {
    try {
      setLoading(true);
      const extension = type === 'csv' ? 'csv' : 'pdf';
      const response = await apiClient.get(`/reports/export?type=${type}&days=${dateRange}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/reports/export?type=csv&days=${dateRange}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export CSV: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAttendanceChart = () => {
    if (!attendanceTrends.length) return null;

    const maxValue = Math.max(...attendanceTrends.map(d => d.present || 0));

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trends</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {attendanceTrends.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-indigo-500 rounded-t"
                style={{
                  height: `${(day.present / maxValue) * 200}px`,
                  minHeight: '4px'
                }}
              ></div>
              <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
            <span>Present Students</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLowAttendanceAlerts = () => {
    if (!insights?.lowAttendanceStudents) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Low Attendance Alerts
        </h3>
        <div className="space-y-3">
          {insights.lowAttendanceStudents.map((student, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div>
                <p className="font-medium text-orange-900">{student.name}</p>
                <p className="text-sm text-orange-700">Attendance Rate: {student.rate}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-600">Class: {student.class}</p>
                <p className="text-xs text-orange-500">Last 30 days</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into attendance patterns and system performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExportReport('attendance')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{summary?.totalStudents || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Average Attendance</p>
              <p className="text-2xl font-bold text-green-900">{summary?.averageAttendance || 0}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Active Classes</p>
              <p className="text-2xl font-bold text-orange-900">{summary?.activeClasses || 0}</p>
            </div>
            <BookOpen className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Reports Generated</p>
              <p className="text-2xl font-bold text-purple-900">{summary?.reportsGenerated || 0}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderAttendanceChart()}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Present</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="font-bold">{summary?.presentCount || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">Absent</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="font-bold">{summary?.absentCount || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-700">Late</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="font-bold">{summary?.lateCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderLowAttendanceAlerts()}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            AI Insights
          </h3>
          <div className="space-y-4">
            {insights?.predictions ? (
              insights.predictions.map((prediction, index) => (
                <div key={index} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">{prediction.title}</h4>
                  <p className="text-sm text-indigo-700 mb-3">{prediction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-indigo-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>Confidence: {prediction.confidence}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">AI insights will be displayed here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => handleExportReport('attendance')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <Calendar className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-blue-900">Attendance Report</h4>
            <p className="text-sm text-blue-700">Detailed attendance records and statistics</p>
          </button>

          <button
            onClick={() => handleExportReport('user-activity')}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Users className="h-8 w-8 text-green-600 mb-2" />
            <h4 className="font-medium text-green-900">User Activity Report</h4>
            <p className="text-sm text-green-700">User engagement and activity metrics</p>
          </button>

          <button
            onClick={() => handleExportReport('system-performance')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-purple-900">System Performance</h4>
            <p className="text-sm text-purple-700">System uptime and performance metrics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
