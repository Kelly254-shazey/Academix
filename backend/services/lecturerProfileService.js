// lecturerProfileService.js
// Lecturer profile management service
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

const lecturerProfileService = {
  // Get lecturer profile
  async getProfile(lecturerId) {
    try {

      const query = `
        SELECT
          u.id,
          u.full_name as name,
          u.email,
          u.role,
          u.created_at,
          lp.bio,
          lp.phone,
          lp.avatar,
          d.name as department,
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT ce.student_id) as total_students,
          COALESCE(AVG(CAST(saa.attendance_percent AS DECIMAL(5,2))), 0) as avg_attendance
        FROM users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.lecturer_id
        LEFT JOIN departments d ON lp.department_id = d.id
        LEFT JOIN classes c ON u.id = c.lecturer_id
        LEFT JOIN sessions s ON c.id = s.class_id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN student_attendance_analytics saa ON c.id = saa.class_id
        WHERE u.id = ? AND u.role = 'lecturer'
        GROUP BY u.id, lp.bio, lp.phone, lp.avatar, d.name
      `;

      const [results] = await db.execute(query, [lecturerId]);

      if (!results || results.length === 0) {
        throw new Error('Lecturer not found');
      }

      const profile = results[0];

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        phone: profile.phone,
        bio: profile.bio,
        avatar: profile.avatar,
        department: profile.department,
        created_at: profile.created_at,
        stats: {
          totalClasses: profile.total_classes || 0,
          totalSessions: profile.total_sessions || 0,
          totalStudents: profile.total_students || 0,
          avgAttendance: Math.round(profile.avg_attendance || 0)
        }
      };
    } catch (error) {
      logger.error('Error fetching lecturer profile:', error);
      throw error;
    }
  },

  // Update lecturer profile
  async updateProfile(lecturerId, profileData) {
    try {

      // Check if lecturer profile exists
      const [existing] = await db.execute(
        'SELECT id FROM lecturer_profiles WHERE lecturer_id = ?',
        [lecturerId]
      );

      if (existing.length === 0) {
        // Create new profile
        await db.execute(
          'INSERT INTO lecturer_profiles (lecturer_id, bio, phone, avatar) VALUES (?, ?, ?, ?)',
          [lecturerId, profileData.bio || '', profileData.phone || '', profileData.avatar || '']
        );
      } else {
        // Update existing profile
        const updateFields = [];
        const updateValues = [];

        if (profileData.bio !== undefined) {
          updateFields.push('bio = ?');
          updateValues.push(profileData.bio);
        }
        if (profileData.phone !== undefined) {
          updateFields.push('phone = ?');
          updateValues.push(profileData.phone);
        }
        if (profileData.avatar !== undefined) {
          updateFields.push('avatar = ?');
          updateValues.push(profileData.avatar);
        }

        if (updateFields.length > 0) {
          updateValues.push(lecturerId);
          await db.execute(
            `UPDATE lecturer_profiles SET ${updateFields.join(', ')} WHERE lecturer_id = ?`,
            updateValues
          );
        }
      }

      // Update user table for name and email
      if (profileData.name || profileData.email) {
        const userUpdateFields = [];
        const userUpdateValues = [];

        if (profileData.name) {
          userUpdateFields.push('full_name = ?');
          userUpdateValues.push(profileData.name);
        }
        if (profileData.email) {
          userUpdateFields.push('email = ?');
          userUpdateValues.push(profileData.email);
        }

        if (userUpdateFields.length > 0) {
          userUpdateValues.push(lecturerId);
          await db.execute(
            `UPDATE users SET ${userUpdateFields.join(', ')} WHERE id = ?`,
            userUpdateValues
          );
        }
      }

      // Return updated profile
      return await this.getProfile(lecturerId);
    } catch (error) {
      logger.error('Error updating lecturer profile:', error);
      throw error;
    }
  }
};

module.exports = lecturerProfileService;