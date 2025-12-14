/**
 * Redis Client Configuration
 * Used for QR token expiry tracking, rate limiting, and caching
 * Falls back to in-memory storage if Redis is unavailable
 */

const logger = require('../utils/logger');

// In-memory fallback storage
const memoryStore = new Map();

// Try to use Redis, fall back to memory
let redisClient = null;
let useRedis = false;

try {
  const redis = require('redis');
  const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    connect_timeout: 5000,
    retry_strategy: (options) => {
      if (options.attempt > 3) return undefined;
      return Math.min(options.attempt * 100, 3000);
    }
  });

  client.on('connect', () => {
    logger.info('Connected to Redis');
    useRedis = true;
  });

  client.on('error', (err) => {
    logger.warn('Redis connection error, using in-memory storage:', err.message);
    useRedis = false;
  });

  redisClient = client;
} catch (error) {
  logger.warn('Redis module not available, using in-memory storage');
}

// Wrapper with fallback to memory
const redisWrapper = {
  async set(key, value) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.set(key, value, (err) => {
          if (err) reject(err);
          else resolve('OK');
        });
      });
    } else {
      memoryStore.set(key, value);
      return 'OK';
    }
  },

  async setex(key, seconds, value) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.setex(key, seconds, value, (err) => {
          if (err) reject(err);
          else resolve('OK');
        });
      });
    } else {
      memoryStore.set(key, value);
      // Simulate expiry with setTimeout
      setTimeout(() => memoryStore.delete(key), seconds * 1000);
      return 'OK';
    }
  },

  async get(key) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.get(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } else {
      return memoryStore.get(key) || null;
    }
  },

  async del(key) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.del(key, (err) => {
          if (err) reject(err);
          else resolve(1);
        });
      });
    } else {
      return memoryStore.delete(key) ? 1 : 0;
    }
  },

  async exists(key) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.exists(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } else {
      return memoryStore.has(key) ? 1 : 0;
    }
  },

  async incr(key) {
    if (useRedis && redisClient) {
      return new Promise((resolve, reject) => {
        redisClient.incr(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } else {
      const current = memoryStore.get(key) || 0;
      const next = current + 1;
      memoryStore.set(key, next);
      return next;
    }
  }
};

module.exports = redisWrapper;
