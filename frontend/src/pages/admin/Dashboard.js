import React from 'react';
import AdminOverview from '../../components/admin/AdminOverview';
import UserManagement from '../../components/admin/UserManagement';
import DepartmentManagement from '../../components/admin/DepartmentManagement';
import AnalyticsPanel from '../../components/admin/AnalyticsPanel';

export default function AdminDashboard(){
  const users = [{id:1,name:'Dr. Smith',role:'lecturer',department:'CS'}, {id:2,name:'Jane Doe',role:'HOD',department:'Math'}];
  const depts = [{id:1,name:'Computer Science',hod:'Dr. Smith',lecturers:20,students:400}];
  const analytics = [{name:'Dept A',value:80},{name:'Dept B',value:60}];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      <AdminOverview stats={{students:1240,lecturers:86,departments:12,courses:240}} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="md:col-span-2 lg:col-span-2 space-y-3 sm:space-y-4">
          <UserManagement users={users} />
          <DepartmentManagement departments={depts} />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <AnalyticsPanel data={analytics} />
        </div>
      </div>
    </div>
  );
}
