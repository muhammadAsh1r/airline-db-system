const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis local');
    } catch (err) {
        console.error('Redis connection error:', err.message);
    }
};

module.exports = { redisClient, connectRedis };
