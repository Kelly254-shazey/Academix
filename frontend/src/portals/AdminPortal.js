import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PortalHeader from '../components/PortalHeader';
import { useAuth } from '../context/AuthContext';

export default function AdminPortal(){
  const { user } = useAuth();

  const navItems = [
    { path: '/portal/admin', label: 'Dashboard', icon: '📊' },
    { path: '/portal/admin/users', label: 'Users', icon: '👥' },
    { path: '/portal/admin/departments', label: 'Departments', icon: '🏢' },
    { path: '/portal/admin/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/admin/reports', label: 'Reports', icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      <PortalHeader portalTitle="👨‍💼 Admin Dashboard" navItems={navItems} />

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
