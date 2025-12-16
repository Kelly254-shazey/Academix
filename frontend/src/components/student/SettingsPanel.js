import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
    notifications: JSON.parse(localStorage.getItem('notifications')) || true,
    language: localStorage.getItem('language') || 'en',
    timezone: localStorage.getItem('timezone') || 'UTC',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    attendanceReminders: true,
    classReminders: true,
    privacyMode: false,
    dataSharing: false,
    autoLogout: 30,
    soundEnabled: true
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    // Load settings from API
    const loadSettings = async () => {
      try {
        const data = await apiClient.get('/settings/student');
        setSettings(prev => ({ ...prev, ...data.settings }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', settings.theme);
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.put('/settings/student', settings);
      // Update localStorage for client-side settings
      localStorage.setItem('notifications', JSON.stringify(settings.notifications));
      localStorage.setItem('language', settings.language);
      localStorage.setItem('timezone', settings.timezone);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">⚙️ Settings & Preferences</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Settings Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'general', label: 'General', icon: '🔧' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'privacy', label: 'Privacy', icon: '🔒' },
            { id: 'accessibility', label: 'Accessibility', icon: '♿' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto Logout (minutes)</label>
              <select
                value={settings.autoLogout}
                onChange={(e) => updateSetting('autoLogout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Email Notifications</span>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => updateSetting('smsNotifications', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">SMS Notifications</span>
                  <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Push Notifications</span>
                  <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.attendanceReminders}
                  onChange={(e) => updateSetting('attendanceReminders', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Attendance Reminders</span>
                  <p className="text-sm text-gray-600">Get reminded about attendance deadlines</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.classReminders}
                  onChange={(e) => updateSetting('classReminders', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Class Reminders</span>
                  <p className="text-sm text-gray-600">Get notified about upcoming classes</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Controls</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.privacyMode}
                  onChange={(e) => updateSetting('privacyMode', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Privacy Mode</span>
                  <p className="text-sm text-gray-600">Limit data sharing and analytics</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.dataSharing}
                  onChange={(e) => updateSetting('dataSharing', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Data Sharing</span>
                  <p className="text-sm text-gray-600">Allow sharing anonymized data for research</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Data Privacy Notice</h4>
            <p className="text-sm text-yellow-700">
              Your personal information is protected under our privacy policy. You can request data deletion
              or export your data at any time by contacting support.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'accessibility' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Accessibility Options</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Sound Notifications</span>
                  <p className="text-sm text-gray-600">Enable audio notifications</p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <select
                  value={settings.fontSize || 'medium'}
                  onChange={(e) => updateSetting('fontSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">High Contrast Mode</label>
                <select
                  value={settings.highContrast || 'off'}
                  onChange={(e) => updateSetting('highContrast', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}