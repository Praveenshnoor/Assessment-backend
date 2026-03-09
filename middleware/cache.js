const { cache } = require('../config/redis');

/**
 * Cache middleware for GET requests
 * @param {number} duration - Cache duration in seconds (default: 1 hour)
 */
const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get cached response
      const cachedResponse = await cache.get(cacheKey);

      if (cachedResponse) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (body) => {
        // Cache the response
        cache.set(cacheKey, body, duration).catch(err => {
          console.error('Failed to cache response:', err.message);
        });

        // Send the response
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err.message);
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/tests/*')
 */
const invalidateCache = async (pattern) => {
  try {
    await cache.delPattern(pattern);
    console.log(`🗑️  Cache invalidated: ${pattern}`);
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
};

/**
 * Invalidate specific cache key
 * @param {string} key - Cache key to invalidate
 */
const invalidateCacheKey = async (key) => {
  try {
    await cache.del(key);
    console.log(`🗑️  Cache key invalidated: ${key}`);
  } catch (err) {
    console.error('Cache key invalidation error:', err.message);
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateCacheKey,
};
