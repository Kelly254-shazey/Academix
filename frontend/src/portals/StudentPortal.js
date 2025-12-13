import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalHeader from '../components/PortalHeader';

export default function StudentPortal(){

  const navItems = [
    { path: '/portal/student', label: 'Dashboard', icon: '📊' },
    { path: '/portal/student/attendance', label: 'Attendance', icon: '📋' },
    { path: '/portal/student/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/student/qr-scanner', label: 'QR Scan', icon: '📸' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PortalHeader portalTitle="👨‍🎓 Student Dashboard" navItems={navItems} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 text-center text-sm text-gray-600">
          <p>ClassTrack AI © 2025 • All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
