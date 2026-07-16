/**
 * Rate-limit store: Redis when ready, else in-memory (safe for single instance).
 * Compatible with express-rate-limit v7+/v8 Store interface.
 */
import { getRedis, isRedisReady } from '../config/redis.js';

export class HybridRateLimitStore {
    constructor({ prefix = 'ecom:rl:' } = {}) {
        // Initialize shared prefix and in-memory fallback state.
        this.prefix = prefix;
        this.windowMs = 60_000;
        this.hits = new Map();
    }

    async init(options) {
        // Read rate-limit window from express-rate-limit configuration.
        this.windowMs = options.windowMs || this.windowMs;
    }

    async increment(key) {
        // Use Redis counters in production-like environments when available.
        const now = Date.now();
        if (isRedisReady()) {
            const redis = getRedis();
            const rkey = `${this.prefix}${key}`;
            const totalHits = await redis.incr(rkey);
            if (totalHits === 1) {
                await redis.pexpire(rkey, this.windowMs);
            }
            const ttl = await redis.pttl(rkey);
            return {
                totalHits,
                resetTime: new Date(now + (ttl > 0 ? ttl : this.windowMs)),
            };
        }

        // Fall back to in-memory counters for local/dev or Redis outages.
        let entry = this.hits.get(key);
        if (!entry || entry.reset <= now) {
            entry = { count: 0, reset: now + this.windowMs };
        }
        entry.count += 1;
        this.hits.set(key, entry);
        return { totalHits: entry.count, resetTime: new Date(entry.reset) };
    }

    async decrement(key) {
        // Decrement counters for skipped requests or retries.
        if (isRedisReady()) {
            const redis = getRedis();
            const rkey = `${this.prefix}${key}`;
            const n = await redis.decr(rkey);
            if (n <= 0) await redis.del(rkey);
            return;
        }
        const entry = this.hits.get(key);
        if (entry) entry.count = Math.max(0, entry.count - 1);
    }

    async resetKey(key) {
        // Clear a single key from whichever backend is active.
        if (isRedisReady()) {
            await getRedis().del(`${this.prefix}${key}`);
            return;
        }
        this.hits.delete(key);
    }
}
