import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function AdminPortal(){
  const location = useLocation();
  const isHome = location.pathname === '/portal/admin';
  const isOverview = location.pathname.includes('/overview');
  const isMessages = location.pathname.includes('/messages');

  const navItems = [
    { path: '/portal/admin', label: 'Home', icon: '🏠' },
    { path: '/portal/admin/overview', label: 'Overview', icon: '📊' },
    { path: '/portal/admin/messages', label: 'Messages', icon: '💬' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">👨‍💼</div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            </div>
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    (item.path === '/portal/admin' && isHome) ||
                    (item.label === 'Overview' && isOverview) ||
                    (item.label === 'Messages' && isMessages)
                      ? 'bg-red-600 text-white shadow-md'
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
                  (item.path === '/portal/admin' && isHome) ||
                  (item.label === 'Overview' && isOverview) ||
                  (item.label === 'Messages' && isMessages)
                    ? 'bg-red-600 text-white'
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
