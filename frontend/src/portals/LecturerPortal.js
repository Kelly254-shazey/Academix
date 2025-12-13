import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalHeader from '../components/PortalHeader';

export default function LecturerPortal(){

  const navItems = [
    { path: '/portal/lecturer', label: 'Dashboard', icon: '📊' },
    { path: '/portal/lecturer/classes', label: 'Classes', icon: '📚' },
    { path: '/portal/lecturer/messages', label: 'Messages', icon: '💬' },
    { path: '/portal/lecturer/qr', label: 'QR Code', icon: '🔲' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <PortalHeader portalTitle="👨‍🏫 Lecturer Dashboard" navItems={navItems} />

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
