import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminOverview({ stats = {} }){
  const trend = stats.trend || [{name:'W1',val:78},{name:'W2',val:80},{name:'W3',val:82},{name:'W4',val:81}];
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Institution Overview</h3>
        <div className="text-sm text-gray-600">Updated: <span className="font-semibold">Now</span></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="p-3 bg-gray-50 rounded text-center">
          <div className="text-xs text-gray-500">Students</div>
          <div className="text-xl font-semibold">{stats.students || 1240}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded text-center">
          <div className="text-xs text-gray-500">Lecturers</div>
          <div className="text-xl font-semibold">{stats.lecturers || 86}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded text-center">
          <div className="text-xs text-gray-500">Departments</div>
          <div className="text-xl font-semibold">{stats.departments || 12}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded text-center">
          <div className="text-xs text-gray-500">Courses</div>
          <div className="text-xl font-semibold">{stats.courses || 240}</div>
        </div>
      </div>

      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <XAxis dataKey="name" />
            <YAxis domain={[0,100]} />
            <Tooltip />
            <Line type="monotone" dataKey="val" stroke="#1f2937" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
