import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/AdminDashboard';
import Reports from '../pages/admin/Reports';
import UserManagement from '../pages/admin/UserManagement';
import DepartmentManagement from '../pages/admin/DepartmentManagement';
import ClassManagement from '../pages/admin/ClassManagement';
import AdminMessaging from '../pages/AdminMessaging';
import AdminAttendance from '../pages/admin/AdminAttendance';
import AdminProfile from '../pages/admin/AdminProfile';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminSupport from '../pages/admin/AdminSupport';
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
          <Route path="users" element={<UserManagement />} />
          <Route path="departments" element={<DepartmentManagement />} />
          <Route path="messages" element={<AdminMessaging />} />
          <Route path="reports" element={<Reports />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="support" element={<AdminSupport />} />
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
