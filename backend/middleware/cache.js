const { redisClient, DEFAULT_EXPIRATION } = require('../config/redis');

const cache = (duration = DEFAULT_EXPIRATION) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedData = await redisClient.get(key);
            
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }

            // Store original res.json to intercept the response
            const originalJson = res.json;
            res.json = function(data) {
                // Store the response in cache before sending
                redisClient.setEx(key, duration, JSON.stringify(data))
                    .catch(err => console.error('Redis cache set error:', err));
                
                // Restore original json method and call it
                res.json = originalJson;
                return res.json(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

// Cache invalidation middleware
const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
        next();
    };
};

module.exports = {
    cache,
    invalidateCache
}; 