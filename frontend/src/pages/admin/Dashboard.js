import React, { useEffect, useState } from 'react';
import AdminOverview from '../../components/admin/AdminOverview';
import UserManagement from '../../components/admin/UserManagement';
import DepartmentManagement from '../../components/admin/DepartmentManagement';
import AnalyticsPanel from '../../components/admin/AnalyticsPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

export default function AdminDashboard(){
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({ students: 0, lecturers: 0, departments: 0, courses: 0 });
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch admin overview stats
        const overviewRes = await fetch(`${API_URL}/api/admin/overview`, { headers });
        if (!overviewRes.ok) throw new Error('Failed to fetch overview');
        const overviewData = await overviewRes.json();
        setStats(overviewData.data || {});

        // Fetch lecturers list
        const lecturersRes = await fetch(`${API_URL}/api/admin/lecturers`, { headers });
        if (!lecturersRes.ok) throw new Error('Failed to fetch lecturers');
        const lecturersData = await lecturersRes.json();
        setUsers(lecturersData.data || []);

        // Fetch departments list
        const deptsRes = await fetch(`${API_URL}/api/admin/departments`, { headers });
        if (!deptsRes.ok) throw new Error('Failed to fetch departments');
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.data || []);

        // Prepare analytics data from departments
        if (deptsData.data) {
          setAnalytics(deptsData.data.slice(0, 5).map(d => ({
            name: d.name || d.department_name,
            value: d.students || d.student_count || 0
          })));
        }
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800 max-w-md">
          <p className="font-bold mb-2">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      <AdminOverview stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="md:col-span-2 lg:col-span-2 space-y-3 sm:space-y-4">
          <UserManagement users={users} />
          <DepartmentManagement departments={departments} />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <AnalyticsPanel data={analytics} />
        </div>
      </div>
    </div>
  );
}
