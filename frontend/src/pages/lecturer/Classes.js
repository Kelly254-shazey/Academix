import React, { useEffect, useState } from 'react';
import { Clock, Users, MapPin, BookOpen, TrendingUp } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get('/api/lecturer/classes');
      if (result.success) {
        const classData = result.data || [];
        setClasses(Array.isArray(classData) ? classData : []);
      } else {
        throw new Error(result.message || 'Failed to fetch classes from database');
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDayColor = (day) => {
    const colors = {
      monday: 'bg-blue-100 text-blue-800',
      tuesday: 'bg-green-100 text-green-800',
      wednesday: 'bg-purple-100 text-purple-800',
      thursday: 'bg-orange-100 text-orange-800',
      friday: 'bg-red-100 text-red-800',
      saturday: 'bg-indigo-100 text-indigo-800',
      sunday: 'bg-gray-100 text-gray-800'
    };
    return colors[day.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Classes</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchClasses}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 My Classes</h1>
          <p className="text-gray-600 mt-1">Manage and view your teaching schedule</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600">{classes.length}</p>
          <p className="text-sm text-gray-600">Total Classes</p>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Classes Assigned</h3>
          <p className="mt-2 text-gray-600">You don't have any classes assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedClass(classItem)}
            >
              {/* Class Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.course_code}</h3>
                  <p className="text-sm text-gray-600 mt-1">{classItem.course_name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDayColor(classItem.day_of_week)}`}>
                  {classItem.day_of_week}
                </span>
              </div>

              {/* Class Details */}
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  {classItem.enrolled_students || 0} students enrolled
                </div>

                {classItem.location_lat && classItem.location_lng && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location tracked
                  </div>
                )}

                {/* Attendance Rate */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Attendance Rate
                  </div>
                  <span className={`text-sm font-semibold ${
                    (classItem.attendance_rate || 0) >= 80 ? 'text-green-600' :
                    (classItem.attendance_rate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {classItem.attendance_rate || 0}%
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Class Detail Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClass.course_code} - {selectedClass.course_name}
                </h2>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Class Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Day</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{selectedClass.day_of_week}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(selectedClass.start_time)} - {formatTime(selectedClass.end_time)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Enrolled Students</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClass.enrolled_students || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Sessions</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClass.total_sessions || 0}</p>
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attendance Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Today's Attendance</p>
                    <p className="text-2xl font-bold text-indigo-600">{selectedClass.today_attendance || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overall Rate</p>
                    <p className="text-2xl font-bold text-green-600">{selectedClass.attendance_rate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Start Session
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  View Roster
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}