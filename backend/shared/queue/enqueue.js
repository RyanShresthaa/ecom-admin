import { logger } from '../utils/logger.js'
import { isQueueEnabled } from './connection.js'
import { getQueue } from './queues.js'
import { QUEUE_NAMES, JOB_NAMES } from './constants.js'
import { runJobInline } from './processors/index.js'

// Add a job to a queue, or run inline when BullMQ is disabled.
async function addJob(queueName, jobName, data, opts = {}) {
    if (!isQueueEnabled()) {
        return runJobInline(queueName, jobName, data)
    }
    const queue = await getQueue(queueName)
    if (!queue) {
        return runJobInline(queueName, jobName, data)
    }
    const job = await queue.add(jobName, data, opts)
    return { queued: true, id: job.id, queue: queueName }
}

// Email queue — transactional mail (replaces PG email_queue when QUEUE_ENABLED).
export function queueEmail(data, opts = {}) {
    return addJob(QUEUE_NAMES.EMAIL, JOB_NAMES.EMAIL_SEND, data, {
        priority: opts.priority ?? 2,
        ...opts,
    })
}

// Payment webhook queue — Stripe/gateway events processed asynchronously.
export function queuePaymentWebhook(data, opts = {}) {
    return addJob(QUEUE_NAMES.PAYMENT_WEBHOOK, JOB_NAMES.PAYMENT_WEBHOOK_EVENT, data, {
        priority: 1,
        ...opts,
    })
}

// Inventory queue — low-stock checks, warehouse sync, stock alerts.
export function queueInventory(jobName, data, opts = {}) {
    return addJob(QUEUE_NAMES.INVENTORY, jobName, data, opts)
}

export function queueLowStockCheck(productIds) {
    return queueInventory(JOB_NAMES.INVENTORY_LOW_STOCK, { productIds })
}

export function queueInventoryNotificationSync() {
    return queueInventory(JOB_NAMES.INVENTORY_SYNC_NOTIFICATIONS, {})
}

export function queueWarehouseSync(data = {}) {
    return queueInventory(JOB_NAMES.INVENTORY_WAREHOUSE_SYNC, data)
}

// Image processing queue — post-upload transforms / optimization.
export function queueImageProcessing(data, opts = {}) {
    return addJob(QUEUE_NAMES.IMAGE_PROCESSING, JOB_NAMES.IMAGE_PROCESS, data, opts)
}

// Notification queue — admin in-app notifications.
export function queueNotification(data, opts = {}) {
    return addJob(QUEUE_NAMES.NOTIFICATION, JOB_NAMES.NOTIFICATION_CREATE, data, opts)
}

// Invoice queue — generate invoice payload / HTML for orders.
export function queueInvoice(data, opts = {}) {
    return addJob(QUEUE_NAMES.INVOICE, JOB_NAMES.INVOICE_GENERATE, data, opts)
}

// Retry queue — re-process failed jobs manually or from dead-letter flow.
export function queueRetry(data, opts = {}) {
    return addJob(QUEUE_NAMES.RETRY, JOB_NAMES.RETRY_FAILED, data, {
        attempts: 5,
        ...opts,
    })
}

// Analytics queue — fire-and-forget event tracking.
export function queueAnalytics(data, opts = {}) {
    return addJob(QUEUE_NAMES.ANALYTICS, JOB_NAMES.ANALYTICS_TRACK, data, {
        priority: 5,
        ...opts,
    })
}

// Cache invalidation queue — async bust of Redis/memory response cache.
export function queueCacheInvalidation(data, opts = {}) {
    return addJob(QUEUE_NAMES.CACHE_INVALIDATION, JOB_NAMES.CACHE_BUST, data, {
        priority: 3,
        ...opts,
    })
}

// Enterprise / scale queues (stubs ready for future workers).
export function queueRecommendation(data, opts = {}) {
    return addJob(QUEUE_NAMES.RECOMMENDATION, JOB_NAMES.RECOMMENDATION_REBUILD, data, opts)
}

export function queueFraudDetection(data, opts = {}) {
    return addJob(QUEUE_NAMES.FRAUD_DETECTION, JOB_NAMES.FRAUD_SCORE, data, opts)
}

export function queueMachineLearning(data, opts = {}) {
    return addJob(QUEUE_NAMES.MACHINE_LEARNING, JOB_NAMES.ML_TRAIN, data, opts)
}

export function queueSearchReindex(data, opts = {}) {
    return addJob(QUEUE_NAMES.SEARCH_INDEX, JOB_NAMES.SEARCH_REINDEX, data, opts)
}

// Log queue health summary for worker startup.
export async function logQueueStatus() {
    if (!isQueueEnabled()) {
        logger.info('BullMQ disabled — jobs run inline (set QUEUE_ENABLED=true + REDIS_URL)')
        return
    }
    logger.info('BullMQ enabled', { queues: Object.values(QUEUE_NAMES).length })
}
