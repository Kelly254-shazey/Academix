const db = require('../database');
const logger = require('../utils/logger');

const gamificationService = {
  // Create badge
  async createBadge(name, description, iconUrl, requirementType, requirementValue) {
    try {
      const [result] = await db.execute(
        `INSERT INTO badges (name, description, icon_url, requirement_type, requirement_value)
         VALUES (?, ?, ?, ?, ?)`,
        [name, description, iconUrl, requirementType, requirementValue]
      );

      return {
        success: true,
        badgeId: result.insertId,
      };
    } catch (error) {
      logger.error('Error creating badge:', error);
      throw error;
    }
  },

  // Get student badges
  async getStudentBadges(studentId) {
    try {
      const [badges] = await db.execute(
        `SELECT 
          b.id,
          b.name,
          b.description,
          b.icon_url,
          b.requirement_type,
          b.requirement_value,
          sb.earned_at,
          sb.progress,
          CASE WHEN sb.earned_at IS NOT NULL THEN 'earned' ELSE 'in_progress' END as status
        FROM badges b
        LEFT JOIN student_badges sb ON b.id = sb.badge_id AND sb.student_id = ?
        ORDER BY sb.earned_at DESC, b.name ASC`,
        [studentId]
      );

      return badges.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        iconUrl: b.icon_url,
        requirementType: b.requirement_type,
        requirementValue: b.requirement_value,
        earnedAt: b.earned_at,
        progress: b.progress || 0,
        status: b.status,
        progressPercent: Math.min(Math.round((b.progress || 0) * 100 / b.requirement_value), 100),
      }));
    } catch (error) {
      logger.error('Error fetching student badges:', error);
      throw error;
    }
  },

  // Update badge progress
  async updateBadgeProgress(studentId, badgeId, progress) {
    try {
      const [existing] = await db.execute(
        `SELECT earned_at FROM student_badges WHERE student_id = ? AND badge_id = ?`,
        [studentId, badgeId]
      );

      if (!existing.length) {
        // Create new badge progress
        await db.execute(
          `INSERT INTO student_badges (student_id, badge_id, progress)
           VALUES (?, ?, ?)`,
          [studentId, badgeId, progress]
        );
      } else if (!existing[0].earned_at) {
        // Update progress
        await db.execute(
          `UPDATE student_badges SET progress = ? WHERE student_id = ? AND badge_id = ?`,
          [progress, studentId, badgeId]
        );
      }

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error updating badge progress:', error);
      throw error;
    }
  },

  // Award badge to student
  async awardBadge(studentId, badgeId) {
    try {
      const [result] = await db.execute(
        `UPDATE student_badges 
         SET earned_at = NOW() 
         WHERE student_id = ? AND badge_id = ? AND earned_at IS NULL`,
        [studentId, badgeId]
      );

      if (result.affectedRows === 0) {
        // Badge not found or already earned
        const [badgeCheck] = await db.execute(
          `SELECT earned_at FROM student_badges WHERE student_id = ? AND badge_id = ?`,
          [studentId, badgeId]
        );

        if (badgeCheck.length && badgeCheck[0].earned_at) {
          return {
            success: false,
            message: 'Badge already earned',
          };
        }

        // Create and award
        await db.execute(
          `INSERT INTO student_badges (student_id, badge_id, earned_at)
           VALUES (?, ?, NOW())`,
          [studentId, badgeId]
        );
      }

      return {
        success: true,
        message: 'Badge awarded successfully',
      };
    } catch (error) {
      logger.error('Error awarding badge:', error);
      throw error;
    }
  },

  // Get attendance streak
  async getAttendanceStreak(studentId, courseId) {
    try {
      const [results] = await db.execute(
        `SELECT 
          current_streak,
          max_streak,
          last_attendance_date
        FROM attendance_streaks
        WHERE student_id = ? AND course_id = ?`,
        [studentId, courseId]
      );

      if (!results.length) {
        return {
          currentStreak: 0,
          maxStreak: 0,
          lastAttendanceDate: null,
        };
      }

      return {
        currentStreak: results[0].current_streak,
        maxStreak: results[0].max_streak,
        lastAttendanceDate: results[0].last_attendance_date,
      };
    } catch (error) {
      logger.error('Error fetching attendance streak:', error);
      throw error;
    }
  },

  // Update attendance streak
  async updateAttendanceStreak(studentId, courseId) {
    try {
      // Get latest attendance
      const [latestAttendance] = await db.execute(
        `SELECT DATE(al.checkin_time) as date
         FROM attendance_logs al
         JOIN class_sessions cs ON al.session_id = cs.id
         WHERE al.student_id = ? AND cs.class_id = ? AND al.verification_status IN ('success', 'late')
         ORDER BY al.checkin_time DESC
         LIMIT 1`,
        [studentId, courseId]
      );

      if (!latestAttendance.length) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastDate = latestAttendance[0].date.toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const [existing] = await db.execute(
        `SELECT current_streak, max_streak FROM attendance_streaks
         WHERE student_id = ? AND course_id = ?`,
        [studentId, courseId]
      );

      let currentStreak = 1;
      let maxStreak = 1;

      if (existing.length > 0) {
        // If last attendance was today or yesterday, increment
        if (lastDate === today || lastDate === yesterday) {
          currentStreak = existing[0].current_streak + 1;
          maxStreak = Math.max(currentStreak, existing[0].max_streak);
        } else {
          // Streak broken, reset
          currentStreak = 1;
          maxStreak = existing[0].max_streak;
        }

        await db.execute(
          `UPDATE attendance_streaks 
           SET current_streak = ?, max_streak = ?, last_attendance_date = NOW()
           WHERE student_id = ? AND course_id = ?`,
          [currentStreak, maxStreak, studentId, courseId]
        );
      } else {
        // Create new streak
        await db.execute(
          `INSERT INTO attendance_streaks (student_id, course_id, current_streak, max_streak, last_attendance_date)
           VALUES (?, ?, 1, 1, NOW())`,
          [studentId, courseId]
        );
      }

      // Check for streak badges
      if (currentStreak === 10) {
        // Find and award 10-day streak badge
        const [badge] = await db.execute(
          `SELECT id FROM badges WHERE requirement_type = 'attendance_streak' AND requirement_value = 10`
        );
        if (badge.length) {
          await this.awardBadge(studentId, badge[0].id);
        }
      }
    } catch (error) {
      logger.error('Error updating attendance streak:', error);
      throw error;
    }
  },

  // Get all streaks for student
  async getAllStreaks(studentId) {
    try {
      const [streaks] = await db.execute(
        `SELECT 
          as.course_id,
          c.course_name,
          c.course_code,
          as.current_streak,
          as.max_streak,
          as.last_attendance_date
        FROM attendance_streaks as
        JOIN classes c ON as.course_id = c.id
        WHERE as.student_id = ?
        ORDER BY as.current_streak DESC`,
        [studentId]
      );

      return streaks.map(s => ({
        courseId: s.course_id,
        courseName: s.course_name,
        courseCode: s.course_code,
        currentStreak: s.current_streak,
        maxStreak: s.max_streak,
        lastAttendanceDate: s.last_attendance_date,
      }));
    } catch (error) {
      logger.error('Error fetching all streaks:', error);
      throw error;
    }
  },

  // Get student progress for leaderboard
  async getStudentProgress(studentId) {
    try {
      const badges = await this.getStudentBadges(studentId);
      const earnedBadges = badges.filter(b => b.status === 'earned');
      const streaks = await this.getAllStreaks(studentId);

      const totalMaxStreak = streaks.reduce((max, s) => Math.max(max, s.maxStreak), 0);
      const [attendance] = await db.execute(
        `SELECT ROUND(AVG(attendance_percent), 2) as avg_attendance
         FROM student_attendance_analytics
         WHERE student_id = ?`,
        [studentId]
      );

      return {
        totalBadgesEarned: earnedBadges.length,
        totalBadgesAvailable: badges.length,
        highestStreak: totalMaxStreak,
        averageAttendance: attendance[0].avg_attendance || 0,
        progressScore: (earnedBadges.length * 10) + totalMaxStreak + (attendance[0].avg_attendance || 0),
      };
    } catch (error) {
      logger.error('Error getting student progress:', error);
      throw error;
    }
  },
};

module.exports = gamificationService;
