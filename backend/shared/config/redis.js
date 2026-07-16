/**
 * Optional Redis client (Phase 5).
 * Set REDIS_URL to enable shared cache + rate limits across API instances.
 * If unset or connection fails, app continues with in-memory fallbacks.
 */
import { logger } from '../utils/logger.js';

let client = null;
let status = 'disabled'; // disabled | connecting | ready | error

// Report redis client lifecycle state for health/readiness endpoints.
export function getRedisStatus() {
    return status;
}

// Return shared Redis client instance used by caches/limiters.
export function getRedis() {
    return client;
}

// Indicate whether Redis is connected and safe for request-time usage.
export function isRedisReady() {
    return Boolean(client && status === 'ready');
}

/**
 * Connect once at boot. Never throws — Redis is optional.
 */
export async function initRedis() {
    const url = String(process.env.REDIS_URL || '').trim();
    if (!url) {
        status = 'disabled';
        logger.info('Redis disabled (REDIS_URL not set) — using in-memory cache/limits');
        return null;
    }

    try {
        const { default: Redis } = await import('ioredis');
        status = 'connecting';
        client = new Redis(url, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            connectTimeout: 5000,
            retryStrategy(times) {
                if (times > 3) return null; // stop retrying
                return Math.min(times * 200, 1000);
            },
        });

        client.on('ready', () => {
            status = 'ready';
        });
        client.on('error', (err) => {
            status = 'error';
            logger.warn('Redis error', { message: err.message });
        });

        await client.ping();
        status = 'ready';
        logger.info('Redis ready');
        return client;
    } catch (err) {
        status = 'error';
        logger.warn('Redis unavailable — falling back to memory', { message: err.message });
        try {
            if (client) {
                client.disconnect();
            }
        } catch {
            /* ignore */
        }
        client = null;
        return null;
    }
}

// Perform lightweight Redis ping for readiness checks.
export async function redisPing() {
    if (!client) return false;
    try {
        const pong = await client.ping();
        if (pong === 'PONG') {
            status = 'ready';
            return true;
        }
        return false;
    } catch {
        status = 'error';
        return false;
    }
}
