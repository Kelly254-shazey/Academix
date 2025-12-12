import React from 'react';

export default function CourseList({ courses = [] }){
  return (
    <div className="p-5 sm:p-6 md:p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">📚 Courses & Attendance</h3>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{courses.length} courses</span>
      </div>
      <div className="space-y-3">
        {courses.map((c, idx) => {
          const statusColor = c.risk ? 'border-red-200 bg-red-50' : c.percentage >= 85 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50';
          return (
            <div key={c.id} className={`p-4 rounded-lg border ${statusColor} hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{c.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{c.attended} of {c.total} classes attended</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-2xl font-bold text-indigo-600">{c.percentage}%</p>
                  {c.risk && <p className="text-xs font-bold text-red-600 mt-1">⚠️ {c.risk}</p>}
                </div>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    c.risk ? 'bg-red-500' :
                    c.percentage >= 85 ? 'bg-green-500' :
                    'bg-yellow-500'
                  }`}
                  style={{width: `${c.percentage}%`}}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
