import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function LecturerOverview({ data = {} }){
  const trend = data.trend || [{name:'W1',val:85},{name:'W2',val:82},{name:'W3',val:88},{name:'W4',val:84}];
  const avgAttendance = data.avg || 83;
  const isHealthy = avgAttendance >= 85;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 sm:px-5 md:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">📊</span>
              Attendance Overview
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1">Weekly performance tracking</p>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm text-indigo-100">Average</div>
            <div className={`text-2xl sm:text-3xl font-bold ${isHealthy ? 'text-green-400' : avgAttendance >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgAttendance}%
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 sm:p-5 md:p-6">
        <div className="h-48 sm:h-56 bg-gray-50/50 rounded-lg p-2 sm:p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis domain={[0,100]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                cursor={{ stroke: '#4f46e5', strokeWidth: 2 }}
              />
              <Line type="monotone" dataKey="val" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
            <p className="text-xs sm:text-sm text-blue-600 font-medium">Today's Classes</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">{data.todayClasses || 3}</p>
          </div>
          <div className={`p-3 sm:p-4 rounded-lg border transition-colors ${
            (data.pending || 0) === 0 
              ? 'bg-green-50 border-green-100 hover:border-green-200' 
              : 'bg-red-50 border-red-100 hover:border-red-200'
          }`}>
            <p className={`text-xs sm:text-sm font-medium ${
              (data.pending || 0) === 0 ? 'text-green-600' : 'text-red-600'
            }`}>Pending Verifications</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${
              (data.pending || 0) === 0 ? 'text-green-700' : 'text-red-700'
            }`}>{data.pending || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
