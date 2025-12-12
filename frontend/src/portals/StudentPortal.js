import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function StudentPortal(){
  const location = useLocation();
  const isHome = location.pathname === '/portal/student';
  const isAttendance = location.pathname.includes('/attendance');
  const isMessages = location.pathname.includes('/messages');

  const navItems = [
    { path: '/portal/student', label: 'Home', icon: '🏠' },
    { path: '/portal/student/attendance', label: 'Attendance', icon: '📋' },
    { path: '/portal/student/messages', label: 'Messages', icon: '💬' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">👨‍🎓</div>
              <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
            </div>
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    (item.path === '/portal/student' && isHome) ||
                    (item.label === 'Attendance' && isAttendance) ||
                    (item.label === 'Messages' && isMessages)
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          {/* Mobile nav */}
          <div className="md:hidden flex space-x-2 mt-3 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap ${
                  (item.path === '/portal/student' && isHome) ||
                  (item.label === 'Attendance' && isAttendance) ||
                  (item.label === 'Messages' && isMessages)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
