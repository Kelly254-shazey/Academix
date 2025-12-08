import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: '+1 (555) 123-4567',
    department: 'Computer Science',
    studentId: 'CS2024001',
    year: 'Third Year'
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReport: true,
    attendanceAlerts: true,
    darkMode: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSaveProfile = () => {
    updateUser({
      name: formData.name,
      email: formData.email
    });
    setIsEditing(false);
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">{user.avatar}</div>
            <h2>{user.name}</h2>
            <p className="user-role">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            <button className="change-avatar-btn">Change Avatar</button>
          </div>

          <div className="profile-stats">
            <div className="stat">
              <div className="stat-number">91.5%</div>
              <div className="stat-text">Attendance</div>
            </div>
            <div className="stat">
              <div className="stat-number">28</div>
              <div className="stat-text">Classes Attended</div>
            </div>
            <div className="stat">
              <div className="stat-number">A</div>
              <div className="stat-text">Current Grade</div>
            </div>
          </div>
        </div>

        <div className="profile-forms">
          <div className="form-section">
            <div className="section-header">
              <h3>📋 Personal Information</h3>
              <button 
                className={`edit-btn ${isEditing ? 'saving' : ''}`}
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              >
                {isEditing ? '💾 Save' : '✏️ Edit'}
              </button>
            </div>

            <form className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input 
                  type="text" 
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>Student ID</label>
                <input 
                  type="text" 
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  disabled={true}
                />
              </div>

              <div className="form-group">
                <label>Year of Study</label>
                <input 
                  type="text" 
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  disabled={true}
                />
              </div>
            </form>
          </div>

          <div className="form-section">
            <h3>🔔 Notification Preferences</h3>
            <div className="preferences-list">
              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="emailNotifications"
                    checked={preferences.emailNotifications}
                    onChange={handlePreferenceChange}
                  />
                  <span>Email Notifications</span>
                </label>
                <p>Receive attendance and class updates via email</p>
              </div>

              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="smsNotifications"
                    checked={preferences.smsNotifications}
                    onChange={handlePreferenceChange}
                  />
                  <span>SMS Notifications</span>
                </label>
                <p>Get urgent alerts via SMS</p>
              </div>

              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="pushNotifications"
                    checked={preferences.pushNotifications}
                    onChange={handlePreferenceChange}
                  />
                  <span>Push Notifications</span>
                </label>
                <p>Receive real-time alerts in the app</p>
              </div>

              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="weeklyReport"
                    checked={preferences.weeklyReport}
                    onChange={handlePreferenceChange}
                  />
                  <span>Weekly Report</span>
                </label>
                <p>Get a summary of your attendance every week</p>
              </div>

              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="attendanceAlerts"
                    checked={preferences.attendanceAlerts}
                    onChange={handlePreferenceChange}
                  />
                  <span>Attendance Alerts</span>
                </label>
                <p>Be notified if you're running low on attendance</p>
              </div>

              <div className="preference-item">
                <label>
                  <input 
                    type="checkbox" 
                    name="darkMode"
                    checked={preferences.darkMode}
                    onChange={handlePreferenceChange}
                  />
                  <span>Dark Mode</span>
                </label>
                <p>Enable dark theme for the application</p>
              </div>
            </div>
          </div>

          <div className="form-section danger">
            <h3>⚠️ Danger Zone</h3>
            <p>These actions cannot be undone</p>
            <button className="btn-danger">🔓 Change Password</button>
            <button className="btn-danger delete">🗑️ Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
