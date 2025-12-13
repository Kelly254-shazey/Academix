import React from 'react';
import { Outlet, Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/lecturer/Dashboard';
import Messages from '../pages/Messages';
import PortalHeader from '../components/PortalHeader';

export default function LecturerPortal(){

  const navItems = [
    { path: '/portal/lecturer', label: 'Dashboard', icon: '📊' },
    { path: '/portal/lecturer/classes', label: 'Classes', icon: '📚' },
    { path: '/portal/lecturer/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/lecturer/qr', label: 'QR Code', icon: '🔲' },
    { path: '/portal/lecturer/attendance', label: 'Attendance', icon: '📋' },
    { path: '/portal/lecturer/profile', label: 'Profile', icon: '👤' },
    { path: '/portal/lecturer/settings', label: 'Settings', icon: '⚙️' },
    { path: '/portal/lecturer/support', label: 'Support', icon: '🆘' },
    { path: '/portal/lecturer/reports', label: 'Reports', icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <PortalHeader portalTitle="👨‍🏫 Lecturer Dashboard" navItems={navItems} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="classes" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Classes Page</h2><p>Coming Soon</p></div>} />
          <Route path="messages" element={<Messages />} />
          <Route path="qr" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">QR Code Page</h2><p>Coming Soon</p></div>} />
          <Route path="attendance" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Attendance Page</h2><p>Coming Soon</p></div>} />
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
