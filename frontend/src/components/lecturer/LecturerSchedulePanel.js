import React from 'react';

export default function LecturerSchedulePanel({ classes = [] }){
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const s = status.toLowerCase();
    if (s.includes('ongoing')) return 'bg-green-100 text-green-700';
    if (s.includes('upcoming')) return 'bg-blue-100 text-blue-700';
    if (s.includes('completed')) return 'bg-gray-100 text-gray-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const getStatusIcon = (status) => {
    if (!status) return '⏱️';
    const s = status.toLowerCase();
    if (s.includes('ongoing')) return '🔴';
    if (s.includes('upcoming')) return '⏭️';
    if (s.includes('completed')) return '✅';
    return '⏸️';
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 sm:px-5 md:px-6 py-3 sm:py-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">📅</span>
          Today's Schedule
        </h3>
        <p className="text-xs sm:text-sm text-cyan-100 mt-1">{classes.length} classes scheduled</p>
      </div>

      {/* Schedule Items */}
      <div className="p-4 sm:p-5 md:p-6">
        {classes.length === 0 ? (
          <div className="text-center py-8 sm:py-10">
            <p className="text-lg sm:text-xl text-gray-400">😴 No classes scheduled</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">You have a free day! Enjoy your break</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {classes.map((c, idx) => (
              <div 
                key={c.id || idx} 
                className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm sm:text-base text-gray-800">{c.name || 'Class'}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(c.status)}`}>
                        {getStatusIcon(c.status)} {c.status || 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <span>🏢 {c.room || 'Room TBD'}</span>
                      <span>•</span>
                      <span>👥 {c.enrolled || 0} students</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg sm:text-xl font-bold text-indigo-600 font-mono">{c.time || '--:--'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
