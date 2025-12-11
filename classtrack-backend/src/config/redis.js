/**
 * Redis Configuration
 * Manages cache for QR tokens, sessions, and temporary data
 */

const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

client.on('error', (err) => {
  console.error('Redis client error', err);
});

client.on('connect', () => {
  console.log('Redis connected successfully');
});

/**
 * Set value in cache with expiration
 * @param {string} key - Cache key
 * @param {string} value - Cache value
 * @param {number} expiresInSeconds - TTL in seconds
 */
const set = async (key, value, expiresInSeconds = 3600) => {
  try {
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    await client.setex(key, expiresInSeconds, value);
  } catch (err) {
    console.error('Redis set error:', err);
  }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<string|null>}
 */
const get = async (key) => {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error('Redis get error:', err);
    return null;
  }
};

/**
 * Delete cache key
 * @param {string} key - Cache key
 */
const del = async (key) => {
  try {
    await client.del(key);
  } catch (err) {
    console.error('Redis del error:', err);
  }
};

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
const exists = async (key) => {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (err) {
    console.error('Redis exists error:', err);
    return false;
  }
};

module.exports = {
  client,
  set,
  get,
  del,
  exists,
};
