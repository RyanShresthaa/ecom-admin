/**
 * Response cache — Redis when available, otherwise in-process Map (Phase 5).
 * Keys are namespaced under `ecom:cache:`.
 */
import { getRedis, isRedisReady } from '../config/redis.js';

const memory = new Map();
const PREFIX = 'ecom:cache:';

function redisKey(key) {
    return `${PREFIX}${key}`;
}

// Serve and memoize computed responses with TTL-based cache entries.
export async function withCache(key, ttlMs, fn) {
    const ttlSec = Math.max(1, Math.ceil(Number(ttlMs) / 1000));

    if (isRedisReady()) {
        const redis = getRedis();
        try {
            const raw = await redis.get(redisKey(key));
            if (raw != null) return JSON.parse(raw);
            const value = await fn();
            await redis.set(redisKey(key), JSON.stringify(value), 'EX', ttlSec);
            return value;
        } catch {
            // fall through to memory / direct
        }
    }

    const hit = memory.get(key);
    if (hit && Date.now() < hit.exp) return hit.value;
    const value = await fn();
    memory.set(key, { value, exp: Date.now() + ttlMs });
    return value;
}

// Invalidate cached responses by prefix — sync implementation used by workers.
export async function bustCacheSync(prefix = '') {
    if (isRedisReady()) {
        const redis = getRedis();
        try {
            const pattern = prefix ? `${PREFIX}${prefix}*` : `${PREFIX}*`;
            let cursor = '0';
            do {
                const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = next;
                if (keys.length) await redis.del(...keys);
            } while (cursor !== '0');
        } catch {
            /* ignore redis bust errors */
        }
    }

    if (!prefix) {
        memory.clear();
        return;
    }
    for (const key of memory.keys()) {
        if (String(key).startsWith(prefix)) memory.delete(key);
    }
}

// Invalidate cache — enqueues async job when BullMQ enabled, else busts inline.
export async function bustCache(prefix = '') {
    try {
        const { isQueueEnabled } = await import('../queue/connection.js');
        if (isQueueEnabled()) {
            const { queueCacheInvalidation } = await import('../queue/enqueue.js');
            queueCacheInvalidation({ prefix }).catch(() => {});
            return;
        }
    } catch {
        /* fall through to sync bust */
    }
    return bustCacheSync(prefix);
}
