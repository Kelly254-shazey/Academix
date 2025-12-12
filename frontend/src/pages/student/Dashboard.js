import React, { useState } from 'react';
import AttendanceOverview from '../../components/student/AttendanceOverview';
import SchedulePanel from '../../components/student/SchedulePanel';
import QRCheckInPanel from '../../components/student/QRCheckInPanel';
import NotificationsPanel from '../../components/student/NotificationsPanel';
import CourseList from '../../components/student/CourseList';
import CalendarView from '../../components/student/CalendarView';
import AIInsightsPanel from '../../components/student/AIInsightsPanel';

const sampleCourses = [
  { id:1, name: 'Data Structures', attended: 18, total: 20, percentage: 90 },
  { id:2, name: 'Web Dev', attended: 14, total: 20, percentage: 70, risk: 'At Risk' },
  { id:3, name: 'AI & ML', attended: 19, total: 20, percentage: 95 }
];

const sampleClasses = [
  { id:1, name: 'Data Structures', time: '10:00 AM', room: 'A101', lecturer: 'Dr. Smith', status: 'upcoming' },
  { id:2, name: 'Web Dev', time: '11:30 AM', room: 'B205', lecturer: 'Prof. Johnson', status: 'ongoing' }
];

export default function StudentDashboard(){
  const [attendanceData] = useState(82);
  
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
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1">{attendanceData}%</p>
              </div>
              <div className="text-3xl opacity-30">✅</div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full" style={{width: `${attendanceData}%`}}></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Classes Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{sampleClasses.length}</p>
              </div>
              <div className="text-3xl opacity-30">📅</div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Next: Web Dev at 11:30 AM</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1">{sampleCourses.length}</p>
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
            <AttendanceOverview overall={82} perCourse={sampleCourses} />
            <CourseList courses={sampleCourses} />
            <CalendarView events={[]} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <SchedulePanel classes={sampleClasses} />
            <QRCheckInPanel lastCheckIn={'Today 09:55 AM'} />
            <AIInsightsPanel insights={{ riskLevel: 'Medium', recommendation: 'Attend 2 extra classes this week', requiredClasses: 2 }} />
            <NotificationsPanel notifications={[{id:1, title:'Lecture started', message:'Data Structures has started' }]} />
          </div>
        </div>
      </div>
    </div>
  );
}
