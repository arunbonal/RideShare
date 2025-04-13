const Redis = require('redis');

const redisClient = Redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: true,
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

const DEFAULT_EXPIRATION = 3600; // 1 hour in seconds

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Redis connection failed:', error);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    DEFAULT_EXPIRATION
}; 