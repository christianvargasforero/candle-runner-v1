import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('❌ [REDIS] Error:', err));
redisClient.on('connect', () => console.log('🔌 [REDIS] Cliente conectado'));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
};

export default redisClient;
