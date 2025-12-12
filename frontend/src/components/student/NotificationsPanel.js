import React from 'react';

export default function NotificationsPanel({ notifications = [] }){
  return (
    <div className="p-5 sm:p-6 md:p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">🔔 Notifications</h3>
        {notifications.length > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>
      <div className="space-y-3 max-h-56 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">✨ All caught up! No new notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="p-3 rounded-lg border border-blue-200 bg-blue-50 hover:border-blue-400 hover:shadow-sm transition-all group">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">📬</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
