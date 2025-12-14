import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/lecturer/Dashboard';
import Classes from '../pages/lecturer/Classes';
import QRCode from '../pages/lecturer/QRCode';
import Attendance from '../pages/lecturer/Attendance';
import Profile from '../pages/lecturer/Profile';
import Settings from '../pages/lecturer/Settings';
import Messages from '../pages/Messages';
import Reports from '../pages/lecturer/Reports';
import Support from '../pages/lecturer/Support';
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
          <Route path="classes" element={<Classes />} />
          <Route path="messages" element={<Messages />} />
          <Route path="qr" element={<QRCode />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />
          <Route path="reports" element={<Reports />} />
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
