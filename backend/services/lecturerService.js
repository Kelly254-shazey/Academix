// lecturerService.js
// Lecturer overview, dashboard, and profile management
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class LecturerService {
  /**
   * Get lecturer overview - today's classes, next class, quick stats
   */
  async getLecturerOverview(lecturerId) {
    try {
      

      const query = `
        SELECT 
          u.id, u.full_name, u.email, u.profile_picture,
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as today_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) as active_sessions,
          COUNT(DISTINCT CASE WHEN s.status = 'not_started' AND s.start_time > NOW() THEN s.id END) as upcoming_sessions,
          COALESCE(AVG(CAST(stats.attendance_percent AS DECIMAL(5,2))), 0) as avg_attendance
        FROM users u
        LEFT JOIN classes c ON u.id = c.lecturer_id
        LEFT JOIN sessions s ON c.id = s.class_id AND DATE(s.start_time) = DATE(NOW())
        LEFT JOIN student_attendance_analytics stats ON c.id = stats.class_id
        WHERE u.id = ? AND u.role = 'lecturer'
        GROUP BY u.id
      `;

      const [results] = await db.execute(query, [lecturerId]);

      if (!results || results.length === 0) {
        throw new Error('Lecturer not found');
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      logger.error('Error in getLecturerOverview:', error);
      throw error;
    }
  }

  /**
   * Get today's classes for lecturer
   */
  async getTodayClasses(lecturerId) {
    try {
      

      const query = `
        SELECT 
          c.id, c.course_code, c.course_name,
          s.id as session_id, s.start_time, s.end_time, s.status,
          s.scanning_enabled, s.started_at, s.cancelled_at,
          c.room_number, c.latitude, c.longitude,
          COUNT(al.id) as enrolled_students,
          COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN al.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN al.status = 'excused' THEN 1 END) as excused_count,
          CASE 
            WHEN s.status = 'in_progress' THEN 'ACTIVE'
            WHEN s.status = 'completed' THEN 'COMPLETED'
            WHEN s.cancelled_at IS NOT NULL THEN 'CANCELLED'
            WHEN s.start_time > NOW() THEN 'UPCOMING'
            ELSE 'NOT_STARTED'
          END as class_state
        FROM classes c
        LEFT JOIN sessions s ON c.id = s.class_id AND DATE(s.start_time) = DATE(NOW())
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ?
        ORDER BY s.start_time ASC
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getTodayClasses:', error);
      throw error;
    }
  }

  /**
   * Get next class for lecturer
   */
  async getNextClass(lecturerId) {
    try {
      

      const query = `
        SELECT 
          c.id, c.course_code, c.course_name,
          s.id as session_id, s.start_time, s.end_time,
          c.room_number, c.latitude, c.longitude,
          TIMESTAMPDIFF(MINUTE, NOW(), s.start_time) as minutes_until,
          COUNT(DISTINCT al.student_id) as enrolled_students
        FROM classes c
        LEFT JOIN sessions s ON c.id = s.class_id
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ? 
          AND s.start_time > NOW()
        ORDER BY s.start_time ASC
        LIMIT 1
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results && results.length > 0 ? results[0] : null,
      };
    } catch (error) {
      logger.error('Error in getNextClass:', error);
      throw error;
    }
  }

  /**
   * Get quick attendance statistics for lecturer
   */
  async getQuickAttendanceStats(lecturerId) {
    try {
      

      const query = `
        SELECT 
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT CASE WHEN saa.attendance_percent >= 75 THEN c.id END) as healthy_classes,
          COUNT(DISTINCT CASE WHEN saa.attendance_percent < 75 THEN c.id END) as at_risk_classes,
          COALESCE(AVG(saa.attendance_percent), 0) as avg_attendance,
          COUNT(DISTINCT CASE WHEN ai.risk_level = 'high' THEN ai.student_id END) as high_risk_students
        FROM classes c
        LEFT JOIN student_attendance_analytics saa ON c.id = saa.class_id
        LEFT JOIN ai_predictions ai ON c.id = ai.class_id AND ai.prediction_type = 'absenteeism_risk'
        WHERE c.lecturer_id = ?
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results && results.length > 0 ? results[0] : {},
      };
    } catch (error) {
      logger.error('Error in getQuickAttendanceStats:', error);
      throw error;
    }
  }

  /**
   * Get alerts for lecturer
   */
  async getLecturerAlerts(lecturerId, limit = 10) {
    try {
      

      const query = `
        SELECT id, class_id, alert_type, title, message, severity, is_read,
               action_url, created_at
        FROM lecturer_alerts
        WHERE lecturer_id = ? AND is_read = FALSE
        ORDER BY severity DESC, created_at DESC
        LIMIT ?
      `;

      const [results] = await db.execute(query, [lecturerId, limit]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerAlerts:', error);
      throw error;
    }
  }

  /**
   * Mark alerts as read
   */
  async markAlertsAsRead(lecturerId, alertIds) {
    try {
      

      const placeholders = alertIds.map(() => '?').join(',');
      const query = `
        UPDATE lecturer_alerts
        SET is_read = TRUE, read_at = NOW()
        WHERE lecturer_id = ? AND id IN (${placeholders})
      `;

      const params = [lecturerId, ...alertIds];
      const [result] = await db.execute(query, params);

      return {
        success: true,
        message: `${result.affectedRows} alert(s) marked as read`,
      };
    } catch (error) {
      logger.error('Error in markAlertsAsRead:', error);
      throw error;
    }
  }

  /**
   * Get lecturer statistics
   */
  async getLecturerStatistics(lecturerId, startDate, endDate) {
    try {
      

      const query = `
        SELECT 
          DATE(s.start_time) as date,
          COUNT(DISTINCT s.id) as sessions_held,
          COUNT(DISTINCT c.id) as classes,
          COUNT(DISTINCT al.student_id) as students_enrolled,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as students_present,
          ROUND(100 * COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / 
                NULLIF(COUNT(DISTINCT al.student_id), 0), 2) as attendance_percent
        FROM sessions s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance_logs al ON s.id = al.session_id
        WHERE c.lecturer_id = ? AND DATE(s.start_time) BETWEEN ? AND ?
        GROUP BY DATE(s.start_time)
        ORDER BY date DESC
      `;

      const [results] = await db.execute(query, [lecturerId, startDate, endDate]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerStatistics:', error);
      throw error;
    }
  }

  /**
   * Get all classes assigned to lecturer
   */
  async getLecturerClasses(lecturerId) {
    try {
      

      const query = `
        SELECT 
          c.id, c.course_code, c.course_name, c.description,
          c.room_number, c.latitude, c.longitude, c.capacity,
          d.name as department_name,
          COUNT(DISTINCT al.student_id) as enrolled_students,
          COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as present_today,
          ROUND(AVG(CASE WHEN al.status = 'present' THEN 100 ELSE 0 END), 2) as attendance_rate
        FROM classes c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN attendance_logs al ON c.id = al.class_id AND DATE(al.checkin_time) = DATE(NOW())
        WHERE c.lecturer_id = ?
        GROUP BY c.id
        ORDER BY c.course_code
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerClasses:', error);
      throw error;
    }
  }

  /**
   * Get class roster for a specific class
   */
  async getClassRoster(lecturerId, classId) {
    try {
      

      // First verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      const query = `
        SELECT 
          u.id, u.name, u.email, u.student_id as student_number,
          COUNT(al.id) as total_sessions,
          COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN al.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN al.status = 'late' THEN 1 END) as late_count,
          ROUND(100 * COUNT(CASE WHEN al.status = 'present' THEN 1 END) / NULLIF(COUNT(al.id), 0), 2) as attendance_rate
        FROM users u
        LEFT JOIN attendance_logs al ON u.id = al.student_id AND al.class_id = ?
        WHERE u.role = 'student'
        GROUP BY u.id
        ORDER BY u.name
      `;

      const [results] = await db.execute(query, [classId]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getClassRoster:', error);
      throw error;
    }
  }

  /**
   * Start a class session
   */
  async startClassSession(lecturerId, classId) {
    try {
      

      // Verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      // Create a new session
      const [result] = await db.execute(
        'INSERT INTO sessions (class_id, start_time, status) VALUES (?, NOW(), ?)',
        [classId, 'in_progress']
      );

      // Update class status if needed
      await db.execute(
        'UPDATE classes SET status = ? WHERE id = ?',
        ['active', classId]
      );

      return {
        success: true,
        data: { sessionId: result.insertId },
      };
    } catch (error) {
      logger.error('Error in startClassSession:', error);
      throw error;
    }
  }

  /**
   * Delay a class session
   */
  async delayClassSession(lecturerId, classId, delayMinutes, reason) {
    try {
      

      // Verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      // Update session with delay
      await db.execute(
        'UPDATE sessions SET start_time = DATE_ADD(start_time, INTERVAL ? MINUTE), status = ? WHERE class_id = ? AND status = ?',
        [delayMinutes, 'delayed', classId, 'not_started']
      );

      return {
        success: true,
        data: { delayMinutes, reason },
      };
    } catch (error) {
      logger.error('Error in delayClassSession:', error);
      throw error;
    }
  }

  /**
   * Cancel a class session
   */
  async cancelClassSession(lecturerId, classId, reason) {
    try {
      

      // Verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      // Cancel session
      await db.execute(
        'UPDATE sessions SET status = ?, cancelled_at = NOW() WHERE class_id = ? AND status IN (?, ?)',
        ['cancelled', classId, 'not_started', 'delayed']
      );

      return {
        success: true,
        data: { reason },
      };
    } catch (error) {
      logger.error('Error in cancelClassSession:', error);
      throw error;
    }
  }

  /**
   * Change class room
   */
  async changeClassRoom(lecturerId, classId, newRoom) {
    try {
      

      // Verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      // Update room
      await db.execute(
        'UPDATE classes SET room_number = ? WHERE id = ?',
        [newRoom, classId]
      );

      return {
        success: true,
        data: { newRoom },
      };
    } catch (error) {
      logger.error('Error in changeClassRoom:', error);
      throw error;
    }
  }

  /**
   * Mark manual attendance
   */
  async markManualAttendance(lecturerId, studentId, classId, sessionId, status, reason) {
    try {
      

      // Verify the class belongs to the lecturer
      const [classCheck] = await db.execute(
        'SELECT id FROM classes WHERE id = ? AND lecturer_id = ?',
        [classId, lecturerId]
      );

      if (!classCheck || classCheck.length === 0) {
        throw new Error('Class not found or does not belong to this lecturer');
      }

      // Insert or update attendance record
      await db.execute(
        `INSERT INTO attendance_logs (student_id, session_id, class_id, status, checkin_time, manual_entry, reason)
         VALUES (?, ?, ?, ?, NOW(), TRUE, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), checkin_time = NOW(), manual_entry = TRUE, reason = VALUES(reason)`,
        [studentId, sessionId, classId, status, reason]
      );

      return {
        success: true,
        data: { studentId, status, reason },
      };
    } catch (error) {
      logger.error('Error in markManualAttendance:', error);
      throw error;
    }
  }

  /**
   * Get lecturer messages
   */
  async getLecturerMessages(lecturerId) {
    try {
      

      const query = `
        SELECT 
          m.id, m.subject, m.message, m.created_at, m.is_read,
          u.name as sender_name, u.email as sender_email,
          c.course_name, c.course_code
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN classes c ON m.class_id = c.id
        WHERE m.recipient_id = ?
        ORDER BY m.created_at DESC
        LIMIT 50
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerMessages:', error);
      throw error;
    }
  }

  /**
   * Send lecturer message
   */
  async sendLecturerMessage(lecturerId, recipientId, subject, message, classId) {
    try {
      

      const [result] = await db.execute(
        'INSERT INTO messages (sender_id, recipient_id, subject, message, class_id) VALUES (?, ?, ?, ?, ?)',
        [lecturerId, recipientId, subject, message, classId]
      );

      return {
        success: true,
        data: { messageId: result.insertId },
      };
    } catch (error) {
      logger.error('Error in sendLecturerMessage:', error);
      throw error;
    }
  }

  /**
   * Get lecturer reports
   */
  async getLecturerReports(lecturerId, startDate, endDate, reportType) {
    try {
      

      let query = '';
      let params = [lecturerId];

      if (reportType === 'attendance') {
        query = `
          SELECT 
            c.course_name, c.course_code,
            COUNT(DISTINCT al.student_id) as total_students,
            COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) as present_students,
            ROUND(100 * COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) / 
                  NULLIF(COUNT(DISTINCT al.student_id), 0), 2) as attendance_rate,
            DATE(al.checkin_time) as date
          FROM classes c
          LEFT JOIN attendance_logs al ON c.id = al.class_id
          WHERE c.lecturer_id = ? AND DATE(al.checkin_time) BETWEEN ? AND ?
          GROUP BY c.id, DATE(al.checkin_time)
          ORDER BY date DESC
        `;
        params = [lecturerId, startDate, endDate];
      } else if (reportType === 'classes') {
        query = `
          SELECT 
            c.course_name, c.course_code, c.room_number,
            COUNT(DISTINCT s.id) as sessions_held,
            COUNT(DISTINCT al.student_id) as total_students,
            ROUND(AVG(CASE WHEN al.status = 'present' THEN 100 ELSE 0 END), 2) as avg_attendance
          FROM classes c
          LEFT JOIN sessions s ON c.id = s.class_id
          LEFT JOIN attendance_logs al ON s.id = al.session_id
          WHERE c.lecturer_id = ?
          GROUP BY c.id
          ORDER BY c.course_code
        `;
      }

      const [results] = await db.execute(query, params);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerReports:', error);
      throw error;
    }
  }

  /**
   * Get lecturer support tickets
   */
  async getLecturerSupportTickets(lecturerId) {
    try {
      

      const query = `
        SELECT 
          id, subject, description, status, priority, category,
          created_at, updated_at, resolved_at
        FROM support_tickets
        WHERE created_by = ?
        ORDER BY created_at DESC
      `;

      const [results] = await db.execute(query, [lecturerId]);

      return {
        success: true,
        data: results || [],
      };
    } catch (error) {
      logger.error('Error in getLecturerSupportTickets:', error);
      throw error;
    }
  }

  /**
   * Create lecturer support ticket
   */
  async createLecturerSupportTicket(lecturerId, subject, description, priority, category) {
    try {
      

      const [result] = await db.execute(
        'INSERT INTO support_tickets (created_by, subject, description, priority, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [lecturerId, subject, description, priority, category, 'open']
      );

      return {
        success: true,
        data: { ticketId: result.insertId },
      };
    } catch (error) {
      logger.error('Error in createLecturerSupportTicket:', error);
      throw error;
    }
  }
}

module.exports = new LecturerService();
