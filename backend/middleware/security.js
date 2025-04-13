const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const { redisClient } = require('../config/redis');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health', // Skip health check endpoint
    // Use Redis as store if available
    store: redisClient ? {
        async increment(key) {
            const current = await redisClient.get(key);
            if (current !== null) {
                const hits = parseInt(current) + 1;
                await redisClient.set(key, hits.toString());
                return {
                    totalHits: hits,
                    resetTime: new Date(Date.now() + windowMs)
                };
            }
            await redisClient.set(key, '1');
            await redisClient.expire(key, Math.ceil(windowMs / 1000));
            return {
                totalHits: 1,
                resetTime: new Date(Date.now() + windowMs)
            };
        },
        async decrement(key) {
            const current = await redisClient.get(key);
            if (current === null) return 0;
            const hits = parseInt(current) - 1;
            if (hits <= 0) {
                await redisClient.del(key);
                return 0;
            }
            await redisClient.set(key, hits.toString());
            return hits;
        },
        async resetKey(key) {
            await redisClient.del(key);
        }
    } : undefined,
    // Use IP for rate limiting when behind proxy
    keyGenerator: (req) => {
        return req.ip;
    },
    // Skip OPTIONS requests
    skip: (req) => req.method === 'OPTIONS',
    // Handler for when rate limit is exceeded
    handler: (req, res) => {
        res.status(429).json({
            error: message,
            retryAfter: windowMs / 1000
        });
    }
});

// General rate limiter - 100 requests per minute
const generalLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    100,
    'Too many requests, please try again later.'
);

// Auth rate limiter - 5 requests per minute
const authLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    5,
    'Too many authentication attempts, please try again later.'
);

// Verification rate limiter - 3 requests per minute
const verificationLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    3,
    'Too many verification attempts, please try again later.'
);

// Configure security middleware
const securityMiddleware = [
    // Basic security headers
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "*.googleapis.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "*.googleapis.com"],
                imgSrc: ["'self'", "data:", "*.googleapis.com"],
                connectSrc: ["'self'", "*.googleapis.com"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false, // Required for Google OAuth
    }),

    // Prevent parameter pollution
    hpp(),
];

// Export all middleware
module.exports = {
    generalLimiter,
    authLimiter,
    verificationLimiter,
    securityMiddleware,
}; 