const db = require('../database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

const userSettingsService = {
  // Get user settings
  async getSettings(userId) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM user_settings WHERE user_id = ?`,
        [userId]
      );

      if (!results.length) {
        // Create default settings
        await db.execute(
          `INSERT INTO user_settings (user_id) VALUES (?)`,
          [userId]
        );
        return this.getDefaultSettings();
      }

      const settings = results[0];
      return {
        notifications: {
          emailNotifications: settings.email_notifications,
          pushNotifications: settings.push_notifications,
          classReminders: settings.class_reminders !== false,
          attendanceAlerts: settings.attendance_alerts !== false,
          systemUpdates: settings.system_updates || false
        },
        preferences: {
          theme: settings.theme || 'light',
          language: settings.language || 'en',
          timezone: settings.timezone || 'UTC',
          dateFormat: settings.date_format || 'MM/DD/YYYY',
          timeFormat: settings.time_format || '12h'
        },
        privacy: {
          profileVisibility: settings.profile_visibility || 'private',
          attendanceVisibility: settings.attendance_visibility || 'private',
          dataSharing: settings.data_sharing || false
        }
      };
    } catch (error) {
      logger.error('Error fetching user settings:', error);
      throw error;
    }
  },

  // Update user settings
  async updateSettings(userId, settingsData) {
    try {
      const updateFields = [];
      const values = [];

      // Flatten nested structure to database fields
      const fieldMap = {
        'notifications.emailNotifications': 'email_notifications',
        'notifications.pushNotifications': 'push_notifications',
        'notifications.classReminders': 'class_reminders',
        'notifications.attendanceAlerts': 'attendance_alerts',
        'notifications.systemUpdates': 'system_updates',
        'preferences.theme': 'theme',
        'preferences.language': 'language',
        'preferences.timezone': 'timezone',
        'preferences.dateFormat': 'date_format',
        'preferences.timeFormat': 'time_format',
        'privacy.profileVisibility': 'profile_visibility',
        'privacy.attendanceVisibility': 'attendance_visibility',
        'privacy.dataSharing': 'data_sharing'
      };

      // Helper function to get nested value
      const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };

      for (const [dataPath, dbField] of Object.entries(fieldMap)) {
        const value = getNestedValue(settingsData, dataPath);
        if (value !== undefined) {
          updateFields.push(`${dbField} = ?`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        return { success: true, message: 'No changes to update' };
      }

      values.push(userId);

      await db.execute(
        `UPDATE user_settings SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = ?`,
        values
      );

      return {
        success: true,
        message: 'Settings updated successfully',
      };
    } catch (error) {
      logger.error('Error updating user settings:', error);
      throw error;
    }
  },

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user's current password hash
      const [results] = await db.execute(
        `SELECT password_hash FROM users WHERE id = ?`,
        [userId]
      );

      if (!results.length) {
        throw new Error('User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, results[0].password_hash);
      if (!isMatch) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.execute(
        `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
        [newPasswordHash, userId]
      );

      // Invalidate all active sessions
      await db.execute(
        `DELETE FROM active_sessions WHERE user_id = ?`,
        [userId]
      );

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  },

  // Get active sessions
  async getActiveSessions(userId) {
    try {
      const [sessions] = await db.execute(
        `SELECT 
          id,
          device_name,
          ip_address,
          user_agent,
          created_at,
          expires_at,
          CASE WHEN expires_at > NOW() THEN 'active' ELSE 'expired' END as status
        FROM active_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC`,
        [userId]
      );

      return sessions.map(session => ({
        id: session.id,
        deviceName: session.device_name,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        status: session.status,
      }));
    } catch (error) {
      logger.error('Error fetching active sessions:', error);
      throw error;
    }
  },

  // Logout all other sessions
  async logoutOtherSessions(userId, currentSessionId) {
    try {
      await db.execute(
        `DELETE FROM active_sessions WHERE user_id = ? AND id != ?`,
        [userId, currentSessionId]
      );

      return {
        success: true,
        message: 'All other sessions have been logged out',
      };
    } catch (error) {
      logger.error('Error logging out other sessions:', error);
      throw error;
    }
  },

  // Revoke specific session
  async revokeSession(userId, sessionId) {
    try {
      const [result] = await db.execute(
        `DELETE FROM active_sessions WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Session not found');
      }

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    }
  },

  // Create session record
  async createSession(userId, tokenHash, deviceName, ipAddress, userAgent) {
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [result] = await db.execute(
        `INSERT INTO active_sessions (user_id, token_hash, device_name, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, tokenHash, deviceName, ipAddress, userAgent, expiresAt]
      );

      return {
        success: true,
        sessionId: result.insertId,
      };
    } catch (error) {
      logger.error('Error creating session record:', error);
      throw error;
    }
  },

  // Clean expired sessions
  async cleanExpiredSessions() {
    try {
      const [result] = await db.execute(
        `DELETE FROM active_sessions WHERE expires_at < NOW()`
      );

      return {
        success: true,
        deletedCount: result.affectedRows,
      };
    } catch (error) {
      logger.error('Error cleaning expired sessions:', error);
      throw error;
    }
  },

  // Get default settings
  getDefaultSettings() {
    return {
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        classReminders: true,
        attendanceAlerts: true,
        systemUpdates: false
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      privacy: {
        profileVisibility: 'private',
        attendanceVisibility: 'private',
        dataSharing: false
      }
    };
  },
};

module.exports = userSettingsService;
