import React from 'react';
import { Outlet, Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/AdminDashboard';
import Reports from '../pages/admin/Reports';
import Messages from '../pages/Messages';
import PortalHeader from '../components/PortalHeader';

export default function AdminPortal(){

  const navItems = [
    { path: '/portal/admin', label: 'Dashboard', icon: '📊' },
    { path: '/portal/admin/users', label: 'Users', icon: '👥' },
    { path: '/portal/admin/departments', label: 'Departments', icon: '🏢' },
    { path: '/portal/admin/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/admin/reports', label: 'Reports', icon: '📋' },
    { path: '/portal/admin/classes', label: 'Classes', icon: '📚' },
    { path: '/portal/admin/attendance', label: 'Attendance', icon: '📋' },
    { path: '/portal/admin/profile', label: 'Profile', icon: '👤' },
    { path: '/portal/admin/settings', label: 'Settings', icon: '⚙️' },
    { path: '/portal/admin/support', label: 'Support', icon: '🆘' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      <PortalHeader portalTitle="👨‍💼 Admin Dashboard" navItems={navItems} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Users Page</h2><p>Coming Soon</p></div>} />
          <Route path="departments" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Departments Page</h2><p>Coming Soon</p></div>} />
          <Route path="messages" element={<Messages />} />
          <Route path="reports" element={<Reports />} />
          <Route path="classes" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Classes Page</h2><p>Coming Soon</p></div>} />
          <Route path="attendance" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Attendance Page</h2><p>Coming Soon</p></div>} />
          <Route path="profile" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Profile Page</h2><p>Coming Soon</p></div>} />
          <Route path="settings" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Settings Page</h2><p>Coming Soon</p></div>} />
          <Route path="support" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Support Page</h2><p>Coming Soon</p></div>} />
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
