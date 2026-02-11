const redis = require('redis');
require('dotenv').config();

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    keepAlive: 30000, // Keep connection alive for 30 seconds
    connectTimeout: 10000, // 10 second connection timeout
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        console.error('❌ Redis: Too many reconnection attempts');
        return new Error('Redis reconnection failed');
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
      return Math.min(retries * 100, 5000);
    },
  },
  // Disable offline queue to prevent memory issues
  enableOfflineQueue: false,
});

// Redis event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis: Connected and ready');
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Ready for caching');
});

redisClient.on('error', (err) => {
  // Silent error - don't spam logs
  if (!redisClient.isOpen) {
    console.log('⚠️  Redis: Not available (running without cache)');
  }
});

redisClient.on('reconnecting', () => {
  // Silent reconnection
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.log('⚠️  Running without Redis cache - performance may be degraded');
    console.log('💡 System will work normally, just without caching benefits');
  }
})();

// Helper functions for caching
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      if (!redisClient.isOpen) return null;
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Redis GET error:', err.message);
      return null;
    }
  },

  // Set value in cache with expiration (in seconds)
  set: async (key, value, expirationInSeconds = 3600) => {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Redis SET error:', err.message);
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.del(key);
      return true;
    } catch (err) {
      console.error('Redis DEL error:', err.message);
      return false;
    }
  },

  // Delete multiple keys matching a pattern
  delPattern: async (pattern) => {
    try {
      if (!redisClient.isOpen) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (err) {
      console.error('Redis DEL pattern error:', err.message);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      if (!redisClient.isOpen) return false;
      return await redisClient.exists(key);
    } catch (err) {
      console.error('Redis EXISTS error:', err.message);
      return false;
    }
  },

  // Get TTL of a key
  ttl: async (key) => {
    try {
      if (!redisClient.isOpen) return -1;
      return await redisClient.ttl(key);
    } catch (err) {
      console.error('Redis TTL error:', err.message);
      return -1;
    }
  },
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
});

process.on('SIGINT', async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
});

module.exports = { redisClient, cache };
