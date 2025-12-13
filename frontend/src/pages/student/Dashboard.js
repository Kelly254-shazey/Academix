import React, { useState, useEffect } from 'react';
import AttendanceOverview from '../../components/student/AttendanceOverview';
import SchedulePanel from '../../components/student/SchedulePanel';
import QRCheckInPanel from '../../components/student/QRCheckInPanel';
import NotificationsPanel from '../../components/student/NotificationsPanel';
import CourseList from '../../components/student/CourseList';
import CalendarView from '../../components/student/CalendarView';
import AIInsightsPanel from '../../components/student/AIInsightsPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

export default function StudentDashboard(){
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attendance, setAttendance] = useState(0);
  const [perCourseAttendance, setPerCourseAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch classes for today
        try {
          const classesRes = await fetch(`${API_URL}/schedule/today`, { headers });
          if (classesRes.ok) {
            const classesData = await classesRes.json();
            setClasses(classesData.data || []);
          }
        } catch (err) {
          // Continue if this endpoint fails
        }

        // Fetch overall attendance
        try {
          const attendanceRes = await fetch(`${API_URL}/attendance-analytics/overall`, { headers });
          if (attendanceRes.ok) {
            const attendanceData = await attendanceRes.json();
            setAttendance(attendanceData.data?.percentage || 0);
          }
        } catch (err) {
          // Continue if this endpoint fails
        }

        // Fetch per-course attendance
        try {
          const perCourseRes = await fetch(`${API_URL}/attendance-analytics/per-course`, { headers });
          if (perCourseRes.ok) {
            const perCourseData = await perCourseRes.json();
            setPerCourseAttendance(perCourseData.data || []);
          }
        } catch (err) {
          // Continue if this endpoint fails
        }

        // Fetch courses - fallback if dashboard endpoint fails
        try {
          const coursesRes = await fetch(`${API_URL}/classes`, { headers });
          if (coursesRes.ok) {
            const coursesData = await coursesRes.json();
            setCourses(coursesData.data || []);
          }
        } catch (err) {
          // Continue if this endpoint fails
        }

        // Fetch notifications
        try {
          const notificationsRes = await fetch(`${API_URL}/notifications?limit=10`, { headers });
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json();
            setNotifications(notificationsData.data || []);
          }
        } catch (err) {
          // Continue if this endpoint fails
        }
      } catch (err) {
        if (process.env.REACT_APP_DEBUG_MODE === 'true') {
          console.error('Error fetching dashboard data:', err);
        }
        // Don't set error to allow partial data display
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800 max-w-md">
          <p className="font-bold mb-2">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        <div className="relative px-3 sm:px-6 md:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">📚 Welcome Back!</h1>
              <p className="text-indigo-100 text-sm sm:text-base md:text-lg">Track your attendance and stay on top of your studies</p>
            </div>
            <div className="hidden md:block text-6xl opacity-20">🎓</div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Overall Attendance</p>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1">{Math.round(attendance)}%</p>
              </div>
              <div className="text-3xl opacity-30">✅</div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full" style={{width: `${Math.round(attendance)}%`}}></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Classes Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{classes.length}</p>
              </div>
              <div className="text-3xl opacity-30">📅</div>
            </div>
            <p className="text-xs text-gray-500 mt-3">{classes.length > 0 ? `Next: ${classes[0].course_name} at ${classes[0].start_time}` : 'No classes today'}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1">{courses.length}</p>
              </div>
              <div className="text-3xl opacity-30">📖</div>
            </div>
            <p className="text-xs text-gray-500 mt-3">All courses active</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Wide */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <AttendanceOverview overall={Math.round(attendance)} perCourse={perCourseAttendance} />
            <CourseList courses={perCourseAttendance} />
            <CalendarView events={[]} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <SchedulePanel classes={classes} />
            <QRCheckInPanel lastCheckIn={null} />
            <AIInsightsPanel />
            <NotificationsPanel notifications={notifications} />
          </div>
        </div>
      </div>
    </div>
  );
}
