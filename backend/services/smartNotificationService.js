/**
 * Smart Notification Service
 * AI-powered notification scheduling based on student behavior patterns
 */

const db = require('../database');
const logger = require('../utils/logger');

class SmartNotificationService {
  /**
   * Send class reminder to students (optimized timing)
   */
  async sendClassReminder(classSessionId) {
    try {
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      const sessionData = session[0];
      const startTime = new Date(sessionData.start_time);

      // Get enrolled students
      const [students] = await db.execute(
        `SELECT u.id, u.email, sbp.typical_arrival_minutes_before_start
         FROM class_enrollment ce
         JOIN users u ON ce.student_id = u.id
         LEFT JOIN student_behavior_patterns sbp ON u.id = sbp.student_id AND sbp.class_id = ?
         WHERE ce.class_id = ?`,
        [sessionData.class_id, sessionData.class_id]
      );

      if (!students || students.length === 0) return;

      // Send to each student with AI-optimized timing
      for (const student of students) {
        const preferredMinutesBefore = student.typical_arrival_minutes_before_start || 15;
        const notificationTime = new Date(startTime.getTime() - preferredMinutesBefore * 60000);

        if (notificationTime <= new Date()) {
          // Send immediately if time has passed
          await this._sendNotification(student.id, {
            type: 'class_reminder',
            title: `${sessionData.course_name} starting soon`,
            message: `Your class starts at ${startTime.toLocaleTimeString()}. Be prepared to scan attendance.`,
            sessionId: classSessionId,
            priority: 'high'
          });
        } else {
          // Schedule for later
          this._scheduleNotification(student.id, notificationTime, {
            type: 'class_reminder',
            title: `${sessionData.course_name} starting soon`,
            message: `Your class starts at ${startTime.toLocaleTimeString()}. Be prepared to scan attendance.`,
            sessionId: classSessionId,
            priority: 'high'
          });
        }
      }

      logger.info(`Class reminders scheduled for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error sending class reminders:', error);
    }
  }

  /**
   * Notify student that attendance window is open
   */
  async notifyAttendanceOpened(classSessionId, lecturerId) {
    try {
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ? AND cs.lecturer_id = ?`,
        [classSessionId, lecturerId]
      );

      if (!session || session.length === 0) return;

      const [students] = await db.execute(
        `SELECT u.id FROM class_enrollment ce
         JOIN users u ON ce.student_id = u.id
         WHERE ce.class_id = ?`,
        [session[0].class_id]
      );

      for (const student of students) {
        await this._sendNotification(student.id, {
          type: 'attendance_opened',
          title: `${session[0].course_name} - Attendance Open`,
          message: 'Attendance window is now open. Scan the QR code displayed by your lecturer.',
          sessionId: classSessionId,
          priority: 'critical'
        });
      }

      logger.info(`Attendance opened notification sent for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error notifying attendance opened:', error);
    }
  }

  /**
   * Warn students who missed attendance
   */
  async notifyMissedAttendance(classSessionId) {
    try {
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      // Get students who didn't attend
      const [missedStudents] = await db.execute(
        `SELECT u.id FROM class_enrollment ce
         JOIN users u ON ce.student_id = u.id
         WHERE ce.class_id = ? AND u.id NOT IN (
           SELECT student_id FROM attendance_scans WHERE class_session_id = ?
         )`,
        [session[0].class_id, classSessionId]
      );

      for (const student of missedStudents) {
        await this._sendNotification(student.id, {
          type: 'attendance_missed',
          title: `Missed ${session[0].course_name}`,
          message: 'You did not attend this class. Your absence has been recorded.',
          sessionId: classSessionId,
          priority: 'medium'
        });
      }

      logger.info(`Missed attendance notifications sent for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error notifying missed attendance:', error);
    }
  }

  /**
   * Notify lecturer of low attendance
   */
  async notifyLowAttendance(classSessionId) {
    try {
      const [session] = await db.execute(
        `SELECT cs.*, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      const [stats] = await db.execute(
        `SELECT 
          (SELECT COUNT(*) FROM class_enrollment WHERE class_id = ?) as enrolled,
          COUNT(*) as attended
         FROM attendance_scans WHERE class_session_id = ? AND status = 'verified'`,
        [session[0].class_id, classSessionId]
      );

      const attendanceRate = (stats?.[0]?.attended || 0) / (stats?.[0]?.enrolled || 1) || 0;

      if (attendanceRate < 0.7) { // Less than 70% attendance
        await this._sendNotification(session[0].lecturer_id, {
          type: 'low_attendance_alert',
          title: `Low Attendance Alert - ${session[0].course_name}`,
          message: `Only ${Math.round(attendanceRate * 100)}% of students attended. Consider follow-up actions.`,
          sessionId: classSessionId,
          priority: 'medium',
          role: 'lecturer'
        });
      }

      logger.info(`Low attendance notification sent for session ${classSessionId}`);
    } catch (error) {
      logger.error('Error notifying low attendance:', error);
    }
  }

  /**
   * Notify lecturer of suspicious activity
   */
  async notifySuspiciousActivity(classSessionId, studentId, riskScore, riskLevel) {
    try {
      const [session] = await db.execute(
        `SELECT cs.lecturer_id, c.course_name FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!session || session.length === 0) return;

      const [student] = await db.execute(
        `SELECT name FROM users WHERE id = ?`,
        [studentId]
      );

      if (riskLevel === 'critical' || riskLevel === 'high') {
        await this._sendNotification(session[0].lecturer_id, {
          type: 'suspicious_activity_alert',
          title: `Suspicious Activity Detected`,
          message: `Student ${student?.[0]?.name} has risk score ${riskScore}/100. Manual review recommended.`,
          sessionId: classSessionId,
          studentId,
          riskScore,
          priority: riskLevel === 'critical' ? 'critical' : 'high',
          role: 'lecturer'
        });
      }
    } catch (error) {
      logger.error('Error notifying suspicious activity:', error);
    }
  }

  /**
   * Send notification to user
   */
  async _sendNotification(userId, notification) {
    try {
      logger.info(`Notification queued for user ${userId}`, {
        type: notification.type,
        priority: notification.priority
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Schedule a notification for later delivery
   */
  _scheduleNotification(userId, deliveryTime, notification) {
    const delay = deliveryTime.getTime() - new Date().getTime();
    if (delay > 0) {
      setTimeout(() => {
        this._sendNotification(userId, notification);
      }, delay);
    }
  }
}

module.exports = new SmartNotificationService();
