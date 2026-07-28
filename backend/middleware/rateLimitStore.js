/**
 * Shared store for express-rate-limit.
 * Redis when REDIS_URL is set; otherwise in-memory (single instance only).
 */
import { RedisStore } from 'rate-limit-redis';
import { initRedis, isRedisConfigured, getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

let store = undefined;
let storeMode = 'memory';

export function getRateLimitStoreMode() {
    return storeMode;
}

export function getRateLimitStore() {
    return store;
}

/**
 * Must run before accepting traffic when Redis is configured.
 * Falls back to memory if Redis connect fails (unless RATE_LIMIT_REQUIRE_REDIS=true).
 */
export async function initRateLimitStore() {
    if (!isRedisConfigured()) {
        store = undefined;
        storeMode = 'memory';
        logger.info('Rate limit store: memory (set REDIS_URL for multi-instance)');
        return store;
    }

    try {
        const client = await initRedis();
        store = new RedisStore({
            sendCommand: (...args) => client.sendCommand(args),
            prefix: process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:',
        });
        storeMode = 'redis';
        logger.info('Rate limit store: redis');
        return store;
    } catch (err) {
        store = undefined;
        storeMode = 'memory';
        if (process.env.RATE_LIMIT_REQUIRE_REDIS === 'true') {
            throw new Error(`Redis rate-limit store required but failed: ${err.message}`, { cause: err });
        }
        logger.warn('Rate limit falling back to memory', { error: err.message });
        return store;
    }
}

/** For tests / diagnostics */
export function __resetRateLimitStoreForTests() {
    store = undefined;
    storeMode = 'memory';
    void getRedisClient;
}
