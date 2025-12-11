const db = require('../database');
const logger = require('../utils/logger');

const dailyScheduleService = {
  // Get today's classes for a student
  async getTodayClasses(studentId) {
    try {
      const today = new Date();
      const dayName = today.toLocaleString('en-US', { weekday: 'long' });

      const [classes] = await db.execute(
        `SELECT 
          c.id,
          c.course_code,
          c.course_name,
          c.start_time,
          c.end_time,
          c.day_of_week,
          c.location_lat,
          c.location_lng,
          l.name as lecturer_name,
          cs.id as session_id,
          CASE 
            WHEN al.id IS NOT NULL AND al.verification_status IN ('success', 'late') THEN 'checked_in'
            WHEN al.id IS NOT NULL THEN al.verification_status
            ELSE 'not_checked_in'
          END as checkin_status
        FROM classes c
        LEFT JOIN users l ON c.lecturer_id = l.id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id AND DATE(cs.session_date) = CURDATE()
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        WHERE c.day_of_week = ?
        ORDER BY c.start_time ASC`,
        [studentId, dayName]
      );

      return classes.map(cls => ({
        classId: cls.id,
        courseCode: cls.course_code,
        courseName: cls.course_name,
        lecturerName: cls.lecturer_name,
        startTime: cls.start_time,
        endTime: cls.end_time,
        location: {
          latitude: cls.location_lat,
          longitude: cls.location_lng,
        },
        sessionId: cls.session_id,
        checkinStatus: cls.checkin_status,
        classStatus: this.getClassStatus(cls.start_time),
      }));
    } catch (error) {
      logger.error('Error fetching today classes:', error);
      throw error;
    }
  },

  // Get upcoming classes for a student
  async getUpcomingClasses(studentId, daysAhead = 7) {
    try {
      const [classes] = await db.execute(
        `SELECT 
          c.id,
          c.course_code,
          c.course_name,
          c.start_time,
          c.end_time,
          c.day_of_week,
          cs.session_date,
          l.name as lecturer_name,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attendance_count
        FROM classes c
        LEFT JOIN users l ON c.lecturer_id = l.id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id AND cs.session_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        WHERE cs.id IS NOT NULL
        GROUP BY c.id, cs.session_date
        ORDER BY cs.session_date ASC, c.start_time ASC
        LIMIT 20`,
        [daysAhead, studentId]
      );

      return classes.map(cls => ({
        classId: cls.id,
        courseCode: cls.course_code,
        courseName: cls.course_name,
        lecturerName: cls.lecturer_name,
        date: cls.session_date,
        startTime: cls.start_time,
        endTime: cls.end_time,
        dayOfWeek: cls.day_of_week,
      }));
    } catch (error) {
      logger.error('Error fetching upcoming classes:', error);
      throw error;
    }
  },

  // Get class status (ongoing, upcoming, completed)
  getClassStatus(startTime) {
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const classStart = new Date();
    classStart.setHours(hours, minutes, 0);

    if (now < classStart) {
      return 'upcoming';
    } else if (now.getTime() - classStart.getTime() < 3600000) { // Within 1 hour
      return 'ongoing';
    } else {
      return 'completed';
    }
  },

  // Get weekly schedule for a student
  async getWeeklySchedule(studentId) {
    try {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const schedule = {};

      for (const day of days) {
        const [classes] = await db.execute(
          `SELECT 
            id,
            course_code,
            course_name,
            start_time,
            end_time,
            location_lat,
            location_lng,
            (SELECT name FROM users WHERE id = classes.lecturer_id) as lecturer_name
          FROM classes
          WHERE day_of_week = ?
          ORDER BY start_time ASC`,
          [day]
        );

        schedule[day] = classes.map(cls => ({
          classId: cls.id,
          courseCode: cls.course_code,
          courseName: cls.course_name,
          lecturerName: cls.lecturer_name,
          startTime: cls.start_time,
          endTime: cls.end_time,
          location: {
            latitude: cls.location_lat,
            longitude: cls.location_lng,
          },
        }));
      }

      return schedule;
    } catch (error) {
      logger.error('Error fetching weekly schedule:', error);
      throw error;
    }
  },
};

module.exports = dailyScheduleService;
