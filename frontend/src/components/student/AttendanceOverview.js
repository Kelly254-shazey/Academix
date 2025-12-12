import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444'];

export default function AttendanceOverview({ overall = 86, perCourse = [] }) {
  const pieData = [
    { name: 'Present', value: overall },
    { name: 'Missing', value: 100 - overall },
  ];

  return (
    <div className="p-5 sm:p-6 md:p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">📊 Attendance Overview</h3>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600">{overall}%</p>
          <p className="text-xs text-gray-500 mt-1">Your attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={65} innerRadius={45} startAngle={90} endAngle={-270}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Attendance by Course</h4>
          <div className="space-y-3">
            {perCourse.map((c, idx) => (
              <div key={c.id} className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    c.percentage >= 85 ? 'bg-green-100 text-green-700' :
                    c.percentage >= 75 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{c.percentage}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        c.percentage >= 85 ? 'bg-green-500' :
                        c.percentage >= 75 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{width: `${c.percentage}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 whitespace-nowrap">{c.attended}/{c.total}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
