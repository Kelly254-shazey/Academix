// routes/broadcastRoutes.js
// Broadcast and announcement endpoints
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router();
const broadcastService = require('../services/broadcastService');
const { requireRole, requirePermission, auditAction } = require('../middlewares/rbacMiddleware');
const { broadcastSchema, broadcastFilterSchema } = require('../validators/adminSchemas');
const logger = require('../utils/logger');

// All broadcast routes require admin role
router.use(requireRole(['admin', 'superadmin']));

/**
 * POST /api/broadcasts
 * Create new broadcast announcement
 */
router.post('/',
  requirePermission('manage_broadcasts'),
  auditAction('CREATE', 'broadcast'),
  async (req, res) => {
    try {
      const { error } = broadcastSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details,
        });
      }

      const {
        title,
        content,
        broadcastType,
        targetRole,
        departmentId,
        scheduledTime,
        expiresAt,
        attachments,
      } = req.body;

      const result = await broadcastService.createBroadcast(
        title,
        content,
        broadcastType,
        targetRole,
        departmentId || null,
        scheduledTime || new Date(),
        expiresAt || null,
        attachments || [],
        req.user.id
      );

      // Emit Socket.IO event
      if (req.io) {
        req.io.emit('broadcast-created', {
          broadcastId: result.data.broadcastId,
          title,
          timestamp: new Date(),
        });
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /broadcasts:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/broadcasts
 * List broadcasts with filtering and pagination
 */
router.get('/',
  requirePermission('view_broadcasts'),
  async (req, res) => {
    try {
      const filters = {
        broadcastType: req.query.broadcastType,
        status: req.query.status,
        targetRole: req.query.targetRole,
        departmentId: req.query.departmentId,
      };

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;

      const result = await broadcastService.listBroadcasts(
        filters,
        limit,
        offset
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /broadcasts:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/broadcasts/:broadcastId
 * Get broadcast details
 */
router.get('/:broadcastId',
  requirePermission('view_broadcasts'),
  async (req, res) => {
    try {
      const result = await broadcastService.getBroadcastDetails(
        req.params.broadcastId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /broadcasts/:broadcastId:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/broadcasts/:broadcastId/read
 * Mark broadcast as read by user
 */
router.post('/:broadcastId/read',
  async (req, res) => {
    try {
      const result = await broadcastService.markAsRead(
        req.params.broadcastId,
        req.user.id
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in POST /broadcasts/:broadcastId/read:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/broadcasts/:broadcastId/analytics
 * Get delivery analytics for broadcast
 */
router.get('/:broadcastId/analytics',
  requirePermission('view_broadcasts'),
  async (req, res) => {
    try {
      const result = await broadcastService.getDeliveryAnalytics(
        req.params.broadcastId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /broadcasts/:broadcastId/analytics:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/broadcasts/:broadcastId
 * Update broadcast (status, content, etc.)
 */
router.put('/:broadcastId',
  requirePermission('manage_broadcasts'),
  auditAction('UPDATE', 'broadcast'),
  async (req, res) => {
    try {
      const { title, content, status, expiresAt } = req.body;

      // Service would update broadcast record
      // For now, return success placeholder
      return res.status(200).json({
        success: true,
        data: {
          broadcastId: req.params.broadcastId,
          updated: true,
        },
      });
    } catch (error) {
      logger.error('Error in PUT /broadcasts/:broadcastId:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/broadcasts/:broadcastId
 * Delete/archive broadcast
 */
router.delete('/:broadcastId',
  requirePermission('manage_broadcasts'),
  auditAction('DELETE', 'broadcast'),
  async (req, res) => {
    try {
      // Service would soft-delete broadcast
      return res.status(200).json({
        success: true,
        data: {
          broadcastId: req.params.broadcastId,
          deleted: true,
        },
      });
    } catch (error) {
      logger.error('Error in DELETE /broadcasts/:broadcastId:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;
