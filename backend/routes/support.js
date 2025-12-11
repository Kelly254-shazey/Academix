const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateRequest } = require('../middlewares/validation');
const schemas = require('../validators/schemas');
const supportService = require('../services/supportService');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// POST /api/support/tickets
// Create support ticket
router.post(
  '/tickets',
  validateRequest(schemas.createTicketSchema),
  async (req, res) => {
    try {
      const { category, subject, description, priority } = req.validatedData;
      const result = await supportService.createTicket(
        req.user.id,
        category,
        subject,
        description,
        priority
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/support/tickets
// Get student's tickets
router.get('/tickets', async (req, res) => {
  try {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await supportService.getStudentTickets(req.user.id, status, limit, offset);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching student tickets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/support/tickets/:id
// Get specific ticket
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await supportService.getTicketById(req.params.id);
    
    // Verify ownership
    if (ticket.studentId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const responses = await supportService.getTicketResponses(req.params.id, req.user.id, req.user.role === 'admin');

    res.json({
      success: true,
      data: {
        ticket,
        responses,
      },
    });
  } catch (error) {
    logger.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/support/tickets/:id/responses
// Add response to ticket
router.post(
  '/tickets/:id/responses',
  validateRequest(schemas.addTicketResponseSchema),
  async (req, res) => {
    try {
      const { response_text, is_internal } = req.validatedData;

      // Only admins can add internal responses
      if (is_internal && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can add internal notes' });
      }

      const result = await supportService.addResponse(
        req.params.id,
        req.user.id,
        response_text,
        is_internal
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error adding response:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/support/tickets/:id
// Update ticket (admin only)
router.put(
  '/tickets/:id',
  validateRequest(schemas.updateTicketSchema),
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can update tickets' });
      }

      const result = await supportService.updateTicketStatus(
        req.params.id,
        req.validatedData.status,
        req.validatedData.assigned_admin_id || req.user.id
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error updating ticket:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/support/stats (admin only)
// Get support ticket statistics
router.get('/stats', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const stats = await supportService.getTicketStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching support stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
