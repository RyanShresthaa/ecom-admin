/**
 * Dedicated Redis connections for BullMQ (requires maxRetriesPerRequest: null).
 * Separate from shared/config/redis.js used for cache + rate limits.
 */
import { logger } from '../utils/logger.js'

let queueConnection = null

// True when BullMQ workers should be used (requires REDIS_URL + QUEUE_ENABLED).
export function isQueueEnabled() {
    return (
        process.env.QUEUE_ENABLED === 'true' &&
        Boolean(String(process.env.REDIS_URL || '').trim())
    )
}

// Create a new ioredis client configured for BullMQ Queue/Worker usage.
export async function createQueueConnection() {
    const url = String(process.env.REDIS_URL || '').trim()
    if (!url) return null
    const { default: IORedis } = await import('ioredis')
    return new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 5000,
    })
}

// Shared singleton connection for Queue producers in the API process.
export async function getQueueConnection() {
    if (!isQueueEnabled()) return null
    if (queueConnection) return queueConnection
    queueConnection = await createQueueConnection()
    queueConnection.on('error', (err) => {
        logger.warn('BullMQ Redis error', { message: err.message })
    })
    return queueConnection
}

// Close shared queue connection (graceful shutdown).
export async function closeQueueConnection() {
    if (queueConnection) {
        await queueConnection.quit().catch(() => queueConnection.disconnect())
        queueConnection = null
    }
}
