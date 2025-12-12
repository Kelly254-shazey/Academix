import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function LecturerPortal(){
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Lecturer Portal</h2>
          <div className="space-x-2">
            <Link to="/portal/lecturer" className="text-sm text-indigo-600">Home</Link>
            <Link to="/portal/lecturer/classes" className="text-sm text-indigo-600">Classes</Link>
            <Link to="/portal/lecturer/messages" className="text-sm text-indigo-600">Messages</Link>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
