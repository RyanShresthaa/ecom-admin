/**
 * Optional Redis client for cluster-wide rate limiting.
 * Connect only when REDIS_URL (or RATE_LIMIT_REDIS_URL) is set.
 */
import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

let client = null;
let connectPromise = null;

export function getRedisUrl() {
    const url = process.env.REDIS_URL || process.env.RATE_LIMIT_REDIS_URL;
    return url?.trim() || '';
}

export function isRedisConfigured() {
    return Boolean(getRedisUrl());
}

export function getRedisClient() {
    return client;
}

/**
 * Connect once. Safe to call repeatedly. Returns null when Redis is not configured.
 */
export async function initRedis() {
    const url = getRedisUrl();
    if (!url) return null;
    if (client?.isOpen) return client;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
        const c = createClient({ url });
        c.on('error', (err) => {
            logger.error('Redis client error', { error: err.message });
        });
        await c.connect();
        client = c;
        logger.info('Redis connected', { purpose: 'rate-limit' });
        return client;
    })();

    try {
        return await connectPromise;
    } catch (err) {
        connectPromise = null;
        client = null;
        throw err;
    }
}

export async function closeRedis() {
    if (!client) return;
    try {
        await client.quit();
    } catch {
        try {
            await client.disconnect();
        } catch {
            /* ignore */
        }
    } finally {
        client = null;
        connectPromise = null;
    }
}
