import React from 'react';

function StatusBadge({ status, delayed, delayMinutes }){
  let style;
  let text;
  let icon;

  if (status === 'active' || status === 'ongoing') {
    style = { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '🔴' };
    text = 'Active';
  } else if (status === 'checked_in') {
    style = { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' };
    text = 'Checked In';
  } else if (status === 'not_checked_in') {
    style = { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⏰' };
    text = delayed ? `Delayed ${delayMinutes}min` : 'Upcoming';
  } else if (status === 'cancelled') {
    style = { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' };
    text = 'Cancelled';
  } else {
    style = { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⏰' };
    text = delayed ? `Delayed ${delayMinutes}min` : 'Upcoming';
  }

  return <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>{style.icon} {text}</span>;
}

export default function SchedulePanel({ classes = [] }){
  return (
    <div className="p-5 sm:p-6 md:p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">📅 Today's Schedule</h3>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{classes.length} classes</span>
      </div>
      <div className="space-y-3">
        {classes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No classes scheduled today</p>
          </div>
        ) : (
          classes.map((c, idx) => (
            <div key={c.classId || c.id} className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📚</span>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-700">{c.courseName || c.course_name}</h4>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span>👨‍🏫 {c.lecturerName || c.lecturer_name}</span>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-xl font-bold text-indigo-600">{c.startTime || c.start_time}</div>
                  <div className="mt-2"><StatusBadge status={c.checkinStatus || c.checkin_status || c.status || 'upcoming'} delayed={c.delayed} delayMinutes={c.delayMinutes} /></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
