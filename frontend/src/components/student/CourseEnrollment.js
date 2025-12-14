import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';

export default function CourseEnrollment() {
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [filter, setFilter] = useState({ day: '', search: '' });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  const fetchAvailableClasses = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get('/classes/available');
      if (result.success) {
        setAvailableClasses(result.data);
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (classId) => {
    try {
      setEnrolling(classId);
      const result = await apiClient.post(`/classes/${classId}/enroll`);
      if (result.success) {
        // Update the local state
        setAvailableClasses(prev =>
          prev.map(cls =>
            cls.id === classId ? { ...cls, is_enrolled: 1 } : cls
          )
        );
        alert('Successfully enrolled in class!');
      }
    } catch (error) {
      console.error('Error enrolling in class:', error);
      alert('Failed to enroll in class. Please try again.');
    } finally {
      setEnrolling(null);
    }
  };

  const handleUnenroll = async (classId) => {
    setConfirmAction(() => () => performUnenroll(classId));
    setShowConfirmDialog(true);
  };

  const performUnenroll = async (classId) => {
    try {
      setEnrolling(classId);
      const result = await apiClient.delete(`/classes/${classId}/enroll`);
      if (result.success) {
        // Update the local state
        setAvailableClasses(prev =>
          prev.map(cls =>
            cls.id === classId ? { ...cls, is_enrolled: 0 } : cls
          )
        );
        alert('Successfully unenrolled from class!');
      }
    } catch (error) {
      console.error('Error unenrolling from class:', error);
      alert('Failed to unenroll from class. Please try again.');
    } finally {
      setEnrolling(null);
      setShowConfirmDialog(false);
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const filteredClasses = availableClasses.filter(cls => {
    const matchesDay = !filter.day || cls.day_of_week === filter.day;
    const matchesSearch = !filter.search ||
      cls.course_name.toLowerCase().includes(filter.search.toLowerCase()) ||
      cls.course_code.toLowerCase().includes(filter.search.toLowerCase()) ||
      cls.lecturer_name.toLowerCase().includes(filter.search.toLowerCase());
    return matchesDay && matchesSearch;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading available classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">📚 Course Enrollment</h2>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {availableClasses.length} available classes
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.day}
          onChange={(e) => setFilter({ ...filter, day: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Days</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
        <input
          type="text"
          placeholder="Search courses..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
        />
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map(cls => (
          <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{cls.course_name}</h3>
                <p className="text-sm text-gray-600">{cls.course_code}</p>
                <p className="text-sm text-gray-500">👨‍🏫 {cls.lecturer_name}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  cls.is_enrolled ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {cls.is_enrolled ? 'Enrolled' : 'Available'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              <p>📅 {cls.day_of_week}</p>
              <p>🕐 {cls.start_time} - {cls.end_time}</p>
              <p>👥 {cls.enrolled_students} students enrolled</p>
            </div>

            <div className="flex justify-end">
              {cls.is_enrolled ? (
                <button
                  onClick={() => handleUnenroll(cls.id)}
                  disabled={enrolling === cls.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md disabled:opacity-50 transition-colors"
                >
                  {enrolling === cls.id ? 'Unenrolling...' : 'Unenroll'}
                </button>
              ) : (
                <button
                  onClick={() => handleEnroll(cls.id)}
                  disabled={enrolling === cls.id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md disabled:opacity-50 transition-colors"
                >
                  {enrolling === cls.id ? 'Enrolling...' : 'Enroll'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No classes match your filters.</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Unenrollment</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unenroll from this class? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Unenroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}