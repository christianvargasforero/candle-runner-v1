import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('❌ [REDIS] Error:', err));
redisClient.on('connect', () => console.log('🔌 [REDIS] Cliente conectado'));
redisClient.on('end', () => console.log('🔌 [REDIS] Cliente desconectado'));

// Flag para trackear estado de conexión
let isConnecting = false;

export const connectRedis = async () => {
    if (redisClient.isOpen) {
        return redisClient;
    }
    
    if (isConnecting) {
        // Esperar a que termine la conexión en curso
        await new Promise(resolve => setTimeout(resolve, 100));
        return redisClient;
    }
    
    try {
        isConnecting = true;
        await redisClient.connect();
        isConnecting = false;
        return redisClient;
    } catch (err) {
        isConnecting = false;
        console.error('❌ [REDIS] Error al conectar:', err.message);
        return null;
    }
};

// Helper seguro para operaciones Redis
export const safeRedisSet = async (key, value) => {
    try {
        if (!redisClient.isOpen) {
            console.warn('⚠️ [REDIS] Cliente cerrado, intentando reconectar...');
            await connectRedis();
        }
        if (redisClient.isOpen) {
            await redisClient.set(key, value);
            return true;
        }
        return false;
    } catch (err) {
        console.error('❌ [REDIS] Error en set:', err.message);
        return false;
    }
};

export const safeRedisGet = async (key) => {
    try {
        if (!redisClient.isOpen) {
            await connectRedis();
        }
        if (redisClient.isOpen) {
            return await redisClient.get(key);
        }
        return null;
    } catch (err) {
        console.error('❌ [REDIS] Error en get:', err.message);
        return null;
    }
};

// Iniciar conexión al importar
connectRedis().catch(err => {
    console.warn('⚠️ [REDIS] No se pudo conectar al inicio:', err.message);
    console.warn('   El servidor funcionará sin persistencia Redis.');
});

export default redisClient;
