import React from 'react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';

export default function LecturerOverview({ data = {} }) {
  // Mock data for demonstration - replace with actual API data
  const lecturerName = data.lecturerName || 'Dr. John Smith';
  const attendanceData = data.attendanceData || [
    { class: 'CS101', attendance: 85 },
    { class: 'CS102', attendance: 78 },
    { class: 'CS103', attendance: 92 },
    { class: 'CS104', attendance: 88 }
  ];
  const overallAttendance = data.overallAttendance || 86;
  const totalClasses = data.totalClasses || 12;
  const todaysSchedule = data.todaysSchedule || [
    { course: 'CS101 - Data Structures', time: '09:00 - 10:30', status: 'completed' },
    { course: 'CS102 - Algorithms', time: '11:00 - 12:30', status: 'active' },
    { course: 'CS103 - Database Systems', time: '14:00 - 15:30', status: 'upcoming' }
  ];
  const classRosters = data.classRosters || [
    { className: 'CS101', studentCount: 45 },
    { className: 'CS102', studentCount: 38 },
    { className: 'CS103', studentCount: 52 },
    { className: 'CS104', studentCount: 41 }
  ];

  const COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'upcoming': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Lecturer Identity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👨‍🏫</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lecturerName}</h2>
            <p className="text-gray-600">Lecturer</p>
          </div>
        </div>
      </div>

      {/* Attendance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per Class Attendance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Per Class Attendance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <XAxis dataKey="class" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="attendance" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Attendance Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Attendance Summary</h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: overallAttendance },
                        { name: 'Absent', value: 100 - overallAttendance }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-3xl font-bold text-gray-900">{overallAttendance}%</p>
              <p className="text-gray-600">Average Attendance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Classes</h3>
            <p className="text-gray-600">Classes assigned to you</p>
          </div>
          <div className="text-4xl font-bold text-indigo-600">{totalClasses}</div>
        </div>
      </div>

      {/* Today's Teaching Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Teaching Schedule</h3>
        <div className="space-y-3">
          {todaysSchedule.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">{item.course}</h4>
                <p className="text-sm text-gray-600">{item.time}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Class Roster Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">Class Roster Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classRosters.map((roster, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">{roster.className}</span>
              <span className="text-indigo-600 font-semibold">{roster.studentCount} students</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
