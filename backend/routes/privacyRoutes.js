// routes/privacyRoutes.js
// GDPR compliance and privacy endpoints
// Author: Backend Team
// Date: December 11, 2025

const express = require('express');
const router = express.Router();
const privacyService = require('../services/privacyService');
const { requireRole, requirePermission, auditAction } = require('../middlewares/rbacMiddleware');
const { privacyRequestSchema } = require('../validators/adminSchemas');
const logger = require('../utils/logger');

/**
 * POST /api/privacy/data-export-request
 * User/admin requests data export
 */
router.post('/data-export-request',
  auditAction('CREATE', 'privacy_request'), async (req, res) => {
    try {
      const { userId, includePersonal = true, includeAcademic = true, format = 'json' } = req.body;

      // Allow users to request their own data, admins can request for others
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      if (requestingUserId !== targetUserId) {
        const hasPermission = req.user.role === 'admin' || req.user.role === 'superadmin';
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'You can only request export of your own data',
          });
        }
      }

      const result = await privacyService.createDataExportRequest(
        targetUserId,
        includePersonal,
        includeAcademic,
        format,
        requestingUserId
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /data-export-request:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/privacy/my-data
 * Get current user's personal data
 */
router.get('/my-data', async (req, res) => {
    try {
      const result = await privacyService.getUserPersonalData(req.user.id);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /my-data:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/privacy/request-deletion
 * Request personal data deletion
 */
router.post('/request-deletion',
  auditAction('CREATE', 'deletion_request'), async (req, res) => {
    try {
      const { userId, reason = '', password } = req.body;

      // Allow users to request deletion of their own account only
      if (req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only request deletion of your own account',
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password confirmation is required for deletion request',
        });
      }

      const result = await privacyService.requestDataDeletion(
        userId,
        reason,
        req.user.id
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in POST /request-deletion:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/privacy/requests
 * List privacy requests (admin only)
 */
router.get('/requests',
  requirePermission('manage_privacy'), async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        requestType: req.query.requestType,
        userId: req.query.userId,
      };

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;

      const result = await privacyService.getPrivacyRequests(
        filters,
        limit,
        offset
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /requests:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/privacy/request/:requestId/approve
 * Approve privacy request (admin only)
 */
router.post('/request/:requestId/approve',
  requirePermission('manage_privacy'),
  auditAction('UPDATE', 'privacy_request'), async (req, res) => {
    try {
      const { notes } = req.body;

      const result = await privacyService.approvePrivacyRequest(
        req.params.requestId,
        req.user.id,
        notes || ''
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      // Emit Socket.IO event
      if (req.io) {
        req.io.emit('privacy-request-approved', {
          requestId: req.params.requestId,
          timestamp: new Date(),
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in POST /request/:requestId/approve:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/privacy/request/:requestId/deny
 * Deny privacy request (admin only)
 */
router.post('/request/:requestId/deny',
  requirePermission('manage_privacy'),
  auditAction('UPDATE', 'privacy_request'), async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Reason for denial is required',
        });
      }

      const result = await privacyService.denyPrivacyRequest(
        req.params.requestId,
        req.user.id,
        reason
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in POST /request/:requestId/deny:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/privacy/audit
 * Get consent audit trail (admin only)
 */
router.get('/audit',
  requirePermission('view_privacy'), async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId,
        consentType: req.query.consentType,
      };

      const result = await privacyService.getConsentAudit(filters);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in GET /audit:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;
