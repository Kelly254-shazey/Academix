const db = require('../database');
const logger = require('../utils/logger');

const studentProfileService = {
  // Get student profile
  async getProfile(studentId) {
    try {
      const [results] = await db.execute(
        `SELECT 
          u.id,
          u.name,
          u.email,
          u.student_id,
          u.department,
          u.avatar,
          sp.bio,
          sp.phone,
          sp.verified_at,
          sp.risk_level,
          (SELECT COUNT(*) FROM verified_devices WHERE student_id = ?) as device_count,
          (SELECT ROUND(AVG(attendance_percent), 2) FROM student_attendance_analytics WHERE student_id = ?) as avg_attendance
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.student_id
        WHERE u.id = ? AND u.role = 'student'`,
        [studentId, studentId, studentId]
      );

      if (!results.length) {
        throw new Error('Student not found');
      }

      const profile = results[0];
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        studentId: profile.student_id,
        department: profile.department,
        avatar: profile.avatar,
        bio: profile.bio,
        phone: profile.phone,
        verifiedAt: profile.verified_at,
        riskLevel: profile.risk_level,
        deviceCount: profile.device_count,
        averageAttendance: profile.avg_attendance || 0,
      };
    } catch (error) {
      logger.error('Error fetching student profile:', error);
      throw error;
    }
  },

  // Update student profile
  async updateProfile(studentId, profileData) {
    try {
      // Check if profile exists
      const [existing] = await db.execute(
        `SELECT id FROM student_profiles WHERE student_id = ?`,
        [studentId]
      );

      if (existing.length === 0) {
        // Create new profile
        await db.execute(
          `INSERT INTO student_profiles (student_id, bio, phone, avatar_url)
           VALUES (?, ?, ?, ?)`,
          [studentId, profileData.bio || null, profileData.phone || null, profileData.avatar_url || null]
        );
      } else {
        // Update existing profile
        const updateFields = [];
        const values = [];

        if (profileData.bio !== undefined) {
          updateFields.push('bio = ?');
          values.push(profileData.bio);
        }
        if (profileData.phone !== undefined) {
          updateFields.push('phone = ?');
          values.push(profileData.phone);
        }
        if (profileData.avatar_url !== undefined) {
          updateFields.push('avatar_url = ?');
          values.push(profileData.avatar_url);
        }

        if (updateFields.length > 0) {
          values.push(studentId);
          await db.execute(
            `UPDATE student_profiles SET ${updateFields.join(', ')} WHERE student_id = ?`,
            values
          );
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      logger.error('Error updating student profile:', error);
      throw error;
    }
  },

  // Upload avatar (returns URL path)
  async updateAvatar(studentId, avatarUrl) {
    try {
      // Update in users table
      await db.execute(
        `UPDATE users SET avatar = ? WHERE id = ?`,
        [avatarUrl, studentId]
      );

      // Update in student_profiles
      const [existing] = await db.execute(
        `SELECT id FROM student_profiles WHERE student_id = ?`,
        [studentId]
      );

      if (existing.length > 0) {
        await db.execute(
          `UPDATE student_profiles SET avatar_url = ? WHERE student_id = ?`,
          [avatarUrl, studentId]
        );
      } else {
        await db.execute(
          `INSERT INTO student_profiles (student_id, avatar_url) VALUES (?, ?)`,
          [studentId, avatarUrl]
        );
      }

      return {
        success: true,
        avatarUrl,
      };
    } catch (error) {
      logger.error('Error updating avatar:', error);
      throw error;
    }
  },

  // Get verified devices
  async getVerifiedDevices(studentId) {
    try {
      const [devices] = await db.execute(
        `SELECT 
          id,
          device_name,
          device_fingerprint,
          is_verified,
          last_used_at,
          created_at
        FROM verified_devices
        WHERE student_id = ?
        ORDER BY last_used_at DESC`,
        [studentId]
      );

      return devices.map(device => ({
        id: device.id,
        deviceName: device.device_name,
        deviceFingerprint: device.device_fingerprint,
        isVerified: device.is_verified,
        lastUsedAt: device.last_used_at,
        createdAt: device.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching verified devices:', error);
      throw error;
    }
  },

  // Remove device
  async removeDevice(studentId, deviceId) {
    try {
      const [result] = await db.execute(
        `DELETE FROM verified_devices WHERE id = ? AND student_id = ?`,
        [deviceId, studentId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Device not found');
      }

      return {
        success: true,
        message: 'Device removed successfully',
      };
    } catch (error) {
      logger.error('Error removing device:', error);
      throw error;
    }
  },

  // Register new device
  async registerDevice(studentId, deviceFingerprint, deviceName) {
    try {
      const [existing] = await db.execute(
        `SELECT id FROM verified_devices WHERE student_id = ? AND device_fingerprint = ?`,
        [studentId, deviceFingerprint]
      );

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Device already registered',
        };
      }

      const [result] = await db.execute(
        `INSERT INTO verified_devices (student_id, device_fingerprint, device_name, is_verified)
         VALUES (?, ?, ?, TRUE)`,
        [studentId, deviceFingerprint, deviceName || 'Unknown Device']
      );

      return {
        success: true,
        deviceId: result.insertId,
        message: 'Device registered successfully',
      };
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  },

  // Get profile completion percentage
  async getProfileCompletion(studentId) {
    try {
      const [profile] = await db.execute(
        `SELECT 
          u.id,
          u.name,
          u.email,
          u.avatar,
          sp.bio,
          sp.phone
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.student_id
        WHERE u.id = ?`,
        [studentId]
      );

      if (!profile.length) return 0;

      const p = profile[0];
      let completion = 20; // ID always present

      if (p.name && p.name.length > 0) completion += 20;
      if (p.email && p.email.length > 0) completion += 15;
      if (p.avatar) completion += 15;
      if (p.bio && p.bio.length > 0) completion += 15;
      if (p.phone && p.phone.length > 0) completion += 15;

      return Math.min(completion, 100);
    } catch (error) {
      logger.error('Error calculating profile completion:', error);
      throw error;
    }
  },
};

module.exports = studentProfileService;
