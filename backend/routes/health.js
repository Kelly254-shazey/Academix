const express = require('express');
const router = express.Router();
const { healthCheck } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// Basic health check
router.get('/', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      services: {
        database: dbHealth,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    };

    if (dbHealth.status !== 'healthy') {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    return sendSuccess(res, `Service is ${health.status}`, health, statusCode);
  } catch (error) {
    return sendError(res, 'Health check failed', 503, process.env.NODE_ENV === 'development', error);
  }
});

module.exports = router;