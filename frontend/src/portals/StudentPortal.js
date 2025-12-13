import React from 'react';
import { Outlet, Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/student/Dashboard';
import AttendanceHistory from '../pages/student/AttendanceHistory';
import QRScanner from '../pages/student/QRScanner';
import Messages from '../pages/Messages';
import NotificationPortal from '../pages/NotificationPortal';
import PortalHeader from '../components/PortalHeader';

export default function StudentPortal(){

  const navItems = [
    { path: '/portal/student', label: 'Dashboard', icon: '📊' },
    { path: '/portal/student/attendance', label: 'Attendance', icon: '📋' },
    { path: '/portal/student/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/student/qr-scanner', label: 'QR Scan', icon: '📸' },
    { path: '/portal/student/profile', label: 'Profile', icon: '👤' },
    { path: '/portal/student/settings', label: 'Settings', icon: '⚙️' },
    { path: '/portal/student/support', label: 'Support', icon: '🆘' },
    { path: '/portal/student/reports', label: 'Reports', icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PortalHeader portalTitle="👨‍🎓 Student Dashboard" navItems={navItems} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="messages" element={<Messages />} />
          <Route path="qr-scanner" element={<QRScanner />} />
          <Route path="profile" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Profile Page</h2><p>Coming Soon</p></div>} />
          <Route path="settings" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Settings Page</h2><p>Coming Soon</p></div>} />
          <Route path="support" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Support Page</h2><p>Coming Soon</p></div>} />
          <Route path="reports" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Reports Page</h2><p>Coming Soon</p></div>} />
        </Routes>
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
