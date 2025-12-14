import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';

export default function ReportsPanel() {
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await apiClient.get(`/reports/student?period=${selectedPeriod}`);
        setReports(data.reports || {});
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [selectedPeriod]);

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-600">Loading reports...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">📊 Academic Reports & Analytics</h2>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="semester">This Semester</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Report Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: '📈' },
            { id: 'attendance', label: 'Attendance', icon: '✅' },
            { id: 'performance', label: 'Performance', icon: '📊' },
            { id: 'trends', label: 'Trends', icon: '📉' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="text-2xl font-bold">{reports.totalClasses || 0}</div>
              <div className="text-sm opacity-90">Total Classes</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="text-2xl font-bold">{reports.attendedClasses || 0}</div>
              <div className="text-sm opacity-90">Classes Attended</div>
            </div>
            <div className={`rounded-lg p-4 text-white ${getAttendanceBgColor(reports.attendancePercentage || 0)}`}>
              <div className="text-2xl font-bold">{reports.attendancePercentage || 0}%</div>
              <div className="text-sm opacity-90">Attendance Rate</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="text-2xl font-bold">{reports.averageGrade || 'N/A'}</div>
              <div className="text-sm opacity-90">Average Grade</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">This Period Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Classes Scheduled:</span>
                  <span className="font-medium">{reports.scheduledClasses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Classes Attended:</span>
                  <span className="font-medium">{reports.attendedClasses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Missed Classes:</span>
                  <span className="font-medium">{reports.missedClasses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Late Arrivals:</span>
                  <span className="font-medium">{reports.lateArrivals || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Academic Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current GPA:</span>
                  <span className="font-medium">{reports.currentGPA || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assignments Completed:</span>
                  <span className="font-medium">{reports.assignmentsCompleted || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tests Passed:</span>
                  <span className="font-medium">{reports.testsPassed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Study Hours:</span>
                  <span className="font-medium">{reports.studyHours || 0}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getAttendanceBgColor(reports.attendancePercentage || 0)} mb-4`}>
              <span className={`text-3xl font-bold ${getAttendanceColor(reports.attendancePercentage || 0)}`}>
                {reports.attendancePercentage || 0}%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Overall Attendance Rate</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">By Subject</h4>
              {reports.subjectAttendance?.map((subject, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{subject.name}</span>
                  <span className={`font-bold ${getAttendanceColor(subject.percentage)}`}>
                    {subject.percentage}%
                  </span>
                </div>
              )) || <p className="text-gray-600">No subject data available</p>}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Recent Attendance</h4>
              {reports.recentAttendance?.slice(0, 5).map((record, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{record.subject}</span>
                    <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.status}
                  </span>
                </div>
              )) || <p className="text-gray-600">No recent attendance data</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Grade Distribution</h4>
              <div className="space-y-3">
                {reports.gradeDistribution?.map((grade, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">{grade.grade}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${grade.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12">{grade.percentage}%</span>
                    </div>
                  </div>
                )) || <p className="text-gray-600">No grade data available</p>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{reports.averageScore || 0}%</div>
                  <div className="text-sm text-blue-800">Average Test Score</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{reports.completedAssignments || 0}</div>
                  <div className="text-sm text-green-800">Assignments Completed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{reports.studyStreak || 0}</div>
                  <div className="text-sm text-purple-800">Day Study Streak</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Attendance Trend</h4>
              <div className="space-y-2">
                {reports.attendanceTrend?.map((week, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">Week {week.week}</span>
                    <span className={`font-medium ${getAttendanceColor(week.percentage)}`}>
                      {week.percentage}%
                    </span>
                  </div>
                )) || <p className="text-gray-600">No trend data available</p>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Performance Trend</h4>
              <div className="space-y-2">
                {reports.performanceTrend?.map((period, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{period.period}</span>
                    <span className="font-medium">{period.score}%</span>
                  </div>
                )) || <p className="text-gray-600">No performance trend data</p>}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Insights & Recommendations</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {reports.attendancePercentage < 75 && (
                <li>• Consider improving attendance to maintain academic standing</li>
              )}
              {reports.averageScore < 70 && (
                <li>• Focus on test preparation and study techniques</li>
              )}
              {reports.studyHours < 10 && (
                <li>• Increase study hours for better academic performance</li>
              )}
              <li>• Keep up the good work with your current progress!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}