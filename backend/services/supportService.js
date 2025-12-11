const db = require('../database');
const logger = require('../utils/logger');

const supportService = {
  // Create support ticket
  async createTicket(studentId, category, subject, description, priority = 'medium') {
    try {
      const [result] = await db.execute(
        `INSERT INTO support_tickets (student_id, category, subject, description, priority)
         VALUES (?, ?, ?, ?, ?)`,
        [studentId, category, subject, description, priority]
      );

      return {
        success: true,
        ticketId: result.insertId,
        message: 'Support ticket created successfully',
      };
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      throw error;
    }
  },

  // Get student's tickets
  async getStudentTickets(studentId, status = null, limit = 20, offset = 0) {
    try {
      let query = `SELECT * FROM support_tickets WHERE student_id = ?`;
      const params = [studentId];

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [tickets] = await db.execute(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM support_tickets WHERE student_id = ?`;
      const countParams = [studentId];
      if (status) {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }

      const [countResult] = await db.execute(countQuery, countParams);

      return {
        tickets: tickets.map(t => ({
          id: t.id,
          category: t.category,
          subject: t.subject,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedAdminId: t.assigned_admin_id,
          createdAt: t.created_at,
          resolvedAt: t.resolved_at,
        })),
        total: countResult[0].total,
      };
    } catch (error) {
      logger.error('Error fetching student tickets:', error);
      throw error;
    }
  },

  // Get all tickets (admin)
  async getAllTickets(status = null, limit = 20, offset = 0) {
    try {
      let query = `SELECT st.*, u.name as student_name, u.email as student_email
        FROM support_tickets st
        JOIN users u ON st.student_id = u.id`;
      const params = [];

      if (status) {
        query += ` WHERE st.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY st.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [tickets] = await db.execute(query, params);

      return tickets.map(t => ({
        id: t.id,
        studentId: t.student_id,
        studentName: t.student_name,
        studentEmail: t.student_email,
        category: t.category,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedAdminId: t.assigned_admin_id,
        createdAt: t.created_at,
        resolvedAt: t.resolved_at,
      }));
    } catch (error) {
      logger.error('Error fetching all tickets:', error);
      throw error;
    }
  },

  // Add response to ticket
  async addResponse(ticketId, responderId, responseText, isInternal = false) {
    try {
      const [result] = await db.execute(
        `INSERT INTO support_responses (ticket_id, responder_id, response_text, is_internal)
         VALUES (?, ?, ?, ?)`,
        [ticketId, responderId, responseText, isInternal]
      );

      // Update ticket's updated_at timestamp
      await db.execute(
        `UPDATE support_tickets SET updated_at = NOW() WHERE id = ?`,
        [ticketId]
      );

      return {
        success: true,
        responseId: result.insertId,
      };
    } catch (error) {
      logger.error('Error adding support response:', error);
      throw error;
    }
  },

  // Get ticket responses
  async getTicketResponses(ticketId, userId, isAdmin = false) {
    try {
      let query = `SELECT * FROM support_responses WHERE ticket_id = ?`;
      const params = [ticketId];

      // Non-admins shouldn't see internal notes
      if (!isAdmin) {
        query += ` AND is_internal = FALSE`;
      }

      query += ` ORDER BY created_at ASC`;

      const [responses] = await db.execute(query, params);

      return responses.map(r => ({
        id: r.id,
        responderId: r.responder_id,
        responseText: r.response_text,
        isInternal: r.is_internal,
        createdAt: r.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching ticket responses:', error);
      throw error;
    }
  },

  // Update ticket status
  async updateTicketStatus(ticketId, status, adminId = null) {
    try {
      const updateData = {
        status,
      };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date();
      }

      if (adminId) {
        updateData.assigned_admin_id = adminId;
      }

      const fields = Object.keys(updateData).map(k => `${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
      const values = Object.values(updateData);
      values.push(ticketId);

      await db.execute(
        `UPDATE support_tickets SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      return {
        success: true,
        message: 'Ticket status updated',
      };
    } catch (error) {
      logger.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Get ticket by ID
  async getTicketById(ticketId) {
    try {
      const [tickets] = await db.execute(
        `SELECT * FROM support_tickets WHERE id = ?`,
        [ticketId]
      );

      if (!tickets.length) {
        throw new Error('Ticket not found');
      }

      return {
        id: tickets[0].id,
        studentId: tickets[0].student_id,
        category: tickets[0].category,
        subject: tickets[0].subject,
        description: tickets[0].description,
        status: tickets[0].status,
        priority: tickets[0].priority,
        assignedAdminId: tickets[0].assigned_admin_id,
        createdAt: tickets[0].created_at,
        resolvedAt: tickets[0].resolved_at,
      };
    } catch (error) {
      logger.error('Error fetching ticket:', error);
      throw error;
    }
  },

  // Get ticket statistics
  async getTicketStats() {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
          AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_resolution_hours
        FROM support_tickets`
      );

      return {
        total: stats[0].total || 0,
        open: stats[0].open_count || 0,
        inProgress: stats[0].in_progress_count || 0,
        resolved: stats[0].resolved_count || 0,
        closed: stats[0].closed_count || 0,
        avgResolutionHours: Math.round(stats[0].avg_resolution_hours || 0),
      };
    } catch (error) {
      logger.error('Error fetching ticket statistics:', error);
      throw error;
    }
  },
};

module.exports = supportService;
