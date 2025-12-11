const db = require('../database');
const logger = require('../utils/logger');

const calendarService = {
  // Create event
  async createEvent(title, eventType, startDate, endDate, startTime, endTime, location, description, classId, createdBy) {
    try {
      const [result] = await db.execute(
        `INSERT INTO calendar_events 
         (title, event_type, class_id, start_date, end_date, start_time, end_time, location, description, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, eventType, classId || null, startDate, endDate, startTime || null, endTime || null, location || null, description || null, createdBy]
      );

      return {
        success: true,
        eventId: result.insertId,
      };
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  },

  // Get events for a date range
  async getEvents(startDate, endDate, eventType = null, classId = null) {
    try {
      let query = `SELECT * FROM calendar_events 
        WHERE start_date >= ? AND end_date <= ?`;
      const params = [startDate, endDate];

      if (eventType) {
        query += ` AND event_type = ?`;
        params.push(eventType);
      }

      if (classId) {
        query += ` AND class_id = ?`;
        params.push(classId);
      }

      query += ` ORDER BY start_date ASC, start_time ASC`;

      const [events] = await db.execute(query, params);

      return events.map(e => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        classId: e.class_id,
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description,
        createdBy: e.created_by,
        createdAt: e.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get events by type
  async getEventsByType(eventType, limit = 20) {
    try {
      const [events] = await db.execute(
        `SELECT 
          e.*,
          c.course_name
        FROM calendar_events e
        LEFT JOIN classes c ON e.class_id = c.id
        WHERE e.event_type = ? AND e.start_date >= CURDATE()
        ORDER BY e.start_date ASC, e.start_time ASC
        LIMIT ?`,
        [eventType, limit]
      );

      return events.map(e => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        courseName: e.course_name,
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description,
        createdAt: e.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching events by type:', error);
      throw error;
    }
  },

  // Get upcoming events
  async getUpcomingEvents(limit = 10) {
    try {
      const [events] = await db.execute(
        `SELECT 
          e.*,
          c.course_name
        FROM calendar_events e
        LEFT JOIN classes c ON e.class_id = c.id
        WHERE e.start_date >= CURDATE()
        ORDER BY e.start_date ASC, e.start_time ASC
        LIMIT ?`,
        [limit]
      );

      return events.map(e => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        courseName: e.course_name,
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
        location: e.location,
        daysUntil: this.daysUntil(e.start_date),
      }));
    } catch (error) {
      logger.error('Error fetching upcoming events:', error);
      throw error;
    }
  },

  // Get class-specific events
  async getClassEvents(classId) {
    try {
      const [events] = await db.execute(
        `SELECT * FROM calendar_events 
         WHERE class_id = ?
         ORDER BY start_date ASC, start_time ASC`,
        [classId]
      );

      return events.map(e => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description,
        createdAt: e.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching class events:', error);
      throw error;
    }
  },

  // Update event
  async updateEvent(eventId, updateData) {
    try {
      const updateFields = [];
      const values = [];

      const fieldMap = {
        title: 'title',
        eventType: 'event_type',
        startDate: 'start_date',
        endDate: 'end_date',
        startTime: 'start_time',
        endTime: 'end_time',
        location: 'location',
        description: 'description',
      };

      for (const [key, dbField] of Object.entries(fieldMap)) {
        if (updateData[key] !== undefined) {
          updateFields.push(`${dbField} = ?`);
          values.push(updateData[key]);
        }
      }

      if (updateFields.length === 0) {
        return { success: true };
      }

      values.push(eventId);

      await db.execute(
        `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async deleteEvent(eventId) {
    try {
      await db.execute(
        `DELETE FROM calendar_events WHERE id = ?`,
        [eventId]
      );

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  },

  // Get calendar for month
  async getMonthCalendar(year, month) {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [events] = await db.execute(
        `SELECT 
          id,
          title,
          event_type,
          start_date,
          start_time,
          location
        FROM calendar_events
        WHERE start_date >= ? AND start_date <= ?
        ORDER BY start_date ASC`,
        [startDate, endDate]
      );

      // Group by date
      const calendar = {};
      events.forEach(event => {
        const dateKey = event.start_date.toISOString().split('T')[0];
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push({
          id: event.id,
          title: event.title,
          type: event.event_type,
          time: event.start_time,
          location: event.location,
        });
      });

      return calendar;
    } catch (error) {
      logger.error('Error fetching month calendar:', error);
      throw error;
    }
  },

  // Helper: Calculate days until event
  daysUntil(date) {
    const today = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },
};

module.exports = calendarService;
