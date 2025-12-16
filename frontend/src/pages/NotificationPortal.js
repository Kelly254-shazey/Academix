import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import apiClient from '../services/apiClient';
import './NotificationPortal.css';

function NotificationPortal() {
  const { user } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { addNotification, addLecturerNotification, lecturerNotifications, sendNotificationToStudents } = useNotifications();
  const [notificationType, setNotificationType] = useState('class-start');
  const [selectedCourse, setSelectedCourse] = useState('Data Structures');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    classTime: '',
    location: '',
    studentName: '',
    absenceReason: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [sentNotifications, setSentNotifications] = useState([]);

  const [courses, setCourses] = React.useState([]);

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await apiClient.get('/classes');
        setCourses(data.data || data || []);
        if ((data.data || data)?.length > 0) setSelectedCourse((data.data || data)[0].name || (data.data || data)[0].course_name);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setCourses([]);
      }
    };
    fetchCourses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!formData.message.trim()) {
      alert('Please enter a message');
      return;
    }

    const selectedCourseObj = courses.find(c => c.name === selectedCourse);

    try {
      if (notificationType === 'class-start') {
        if (!formData.classTime || !formData.location) {
          alert('Please fill in class time and location');
          return;
        }

        await sendNotificationToStudents({
          type: 'class-start',
          title: `${selectedCourse} Starting Soon`,
          message: formData.message,
          courseId: selectedCourseObj.id,
          course: selectedCourse,
          classTime: formData.classTime,
          location: formData.location,
          targetUsers: []
        });

        setSentNotifications(prev => [...prev, {
          id: Math.random(),
          type: 'class-start',
          course: selectedCourse,
          message: formData.message,
          time: new Date(),
          recipients: selectedCourseObj.students,
          delivered: true
        }]);

        setSuccessMessage(`✅ Class start notification sent INSTANTLY to ${selectedCourseObj.students} students!`);
      } else if (notificationType === 'missing-class') {
        if (!formData.studentName) {
          alert('Please select a student');
          return;
        }

        await sendNotificationToStudents({
          type: 'missing-class',
          title: `⚠️ Attendance Issue: ${formData.studentName}`,
          message: formData.message,
          courseId: selectedCourseObj.id,
          course: selectedCourse,
          studentName: formData.studentName,
          absenceReason: formData.absenceReason,
          targetUsers: []
        });

        setSentNotifications(prev => [...prev, {
          id: Math.random(),
          type: 'missing-class',
          course: selectedCourse,
          student: formData.studentName,
          message: formData.message,
          time: new Date(),
          recipients: 1,
          delivered: true
        }]);

        setSuccessMessage(`✅ Missing class notification sent INSTANTLY to ${formData.studentName}!`);
      }

      // Reset form
      setFormData({
        title: '',
        message: '',
        classTime: '',
        location: '',
        studentName: '',
        absenceReason: ''
      });

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error sending notification:', error);
      setSuccessMessage('❌ Error sending notification. Please try again.');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Check if user is lecturer
  if (user?.role !== 'lecturer') {
    return (
      <div className="notification-portal-container">
        <div className="access-denied">
          <div className="denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Only lecturers can access the notification portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-portal-container">
      <div className="portal-header">
        <h1>📢 Notification Portal</h1>
        <p>Send notifications to students about class schedules and attendance</p>
      </div>

      <div className="portal-grid">
        <div className="portal-form-section">
          <div className="form-card">
            <h2>Create Notification</h2>

            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSendNotification}>
              <div className="form-group">
                <label>Notification Type</label>
                <div className="notification-type-selector">
                  <button
                    type="button"
                    className={`type-btn ${notificationType === 'class-start' ? 'active' : ''}`}
                    onClick={() => setNotificationType('class-start')}
                  >
                    <span className="type-icon">⏰</span>
                    <span>Class Starting</span>
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${notificationType === 'missing-class' ? 'active' : ''}`}
                    onClick={() => setNotificationType('missing-class')}
                  >
                    <span className="type-icon">⚠️</span>
                    <span>Missing Class</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Select Course</label>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>
                      {course.name} ({course.code}) - {course.students} students
                    </option>
                  ))}
                </select>
              </div>

              {notificationType === 'class-start' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Class Time</label>
                      <input
                        type="time"
                        name="classTime"
                        value={formData.classTime}
                        onChange={handleInputChange}
                        placeholder="e.g., 10:00 AM"
                      />
                    </div>
                    <div className="form-group">
                      <label>Location/Room</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., Room A101"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Student ID or Email</label>
                    <input
                      type="text"
                      name="studentName"
                      value={formData.studentName}
                      onChange={handleInputChange}
                      placeholder="Enter student ID or email"
                    />
                  </div>

                  <div className="form-group">
                    <label>Absence Reason</label>
                    <select value={formData.absenceReason} onChange={(e) => setFormData(prev => ({ ...prev, absenceReason: e.target.value }))}>
                      <option value="">-- Select reason --</option>
                      <option value="no-show">No Show</option>
                      <option value="late">Late Arrival</option>
                      <option value="unauthorized">Unauthorized Absence</option>
                      <option value="medical">Medical Reason</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder={notificationType === 'class-start' 
                    ? "e.g., Please be on time. We will start promptly at the scheduled time."
                    : "e.g., You were marked absent today. Please contact the instructor if this is an error."}
                  rows="5"
                />
              </div>

              <button type="submit" className="btn-send">
                📤 Send Notification
              </button>
            </form>
          </div>
        </div>

        <div className="portal-stats-section">
          <div className="stats-card">
            <h3>📊 Notification Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">📢</div>
                <div className="stat-text">
                  <div className="stat-number">{sentNotifications.length}</div>
                  <div className="stat-label">Sent Today</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">👥</div>
                <div className="stat-text">
                  <div className="stat-number">{sentNotifications.reduce((sum, n) => sum + n.recipients, 0)}</div>
                  <div className="stat-label">Total Recipients</div>
                </div>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <h3>📝 Recent Notifications</h3>
            <div className="notifications-log">
              {sentNotifications.length === 0 ? (
                <p className="empty-log">No notifications sent yet</p>
              ) : (
                sentNotifications.map(notif => (
                  <div key={notif.id} className={`notification-log-item ${notif.type}`}>
                    <div className="log-icon">
                      {notif.type === 'class-start' ? '⏰' : '⚠️'}
                    </div>
                    <div className="log-content">
                      <h4>{notif.course}</h4>
                      <p>{notif.message}</p>
                      {notif.type === 'class-start' && (
                        <span className="log-meta">👥 {notif.recipients} students</span>
                      )}
                      {notif.type === 'missing-class' && (
                        <span className="log-meta">👤 {notif.student}</span>
                      )}
                    </div>
                    <div className="log-time">
                      {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationPortal;
