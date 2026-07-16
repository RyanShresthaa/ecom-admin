import { Worker } from 'bullmq'
import { logger } from '../utils/logger.js'
import { createQueueConnection, isQueueEnabled } from './connection.js'
import { QUEUE_NAMES, JOB_NAMES } from './constants.js'
import { getQueue } from './queues.js'
import { getProcessor } from './processors/registry.js'

const workers = []

// Start a BullMQ worker for one queue with shared connection options.
function startWorker(queueName, connection) {
    const processor = getProcessor(queueName)
    if (!processor) {
        logger.warn('No processor for queue — skipping worker', { queueName })
        return null
    }

    const concurrency = Number(process.env.QUEUE_WORKER_CONCURRENCY || 5)
    const worker = new Worker(
        queueName,
        async (job) => processor(job),
        {
            connection,
            concurrency,
        },
    )

    worker.on('completed', (job) => {
        logger.info('Job completed', { queue: queueName, name: job.name, id: job.id })
    })
    worker.on('failed', (job, err) => {
        logger.warn('Job failed', {
            queue: queueName,
            name: job?.name,
            id: job?.id,
            error: err.message,
        })
    })

    workers.push(worker)
    return worker
}

// Register repeatable scheduled jobs (cart reminders, coupon expiry, low-stock).
async function registerScheduledJobs() {
    const queue = await getQueue(QUEUE_NAMES.SCHEDULED)
    if (!queue) return

    const everyMs = (hours) => hours * 60 * 60 * 1000

    await queue.add(
        JOB_NAMES.SCHEDULED_CART_REMINDERS,
        {},
        {
            repeat: { every: everyMs(Number(process.env.SCHEDULED_CART_REMINDERS_HOURS || 24)) },
            jobId: 'scheduled-cart-reminders',
        },
    )
    await queue.add(
        JOB_NAMES.SCHEDULED_COUPON_EXPIRY,
        {},
        {
            repeat: { every: everyMs(Number(process.env.SCHEDULED_COUPON_EXPIRY_HOURS || 1)) },
            jobId: 'scheduled-coupon-expiry',
        },
    )
    await queue.add(
        JOB_NAMES.SCHEDULED_LOW_STOCK,
        {},
        {
            repeat: { every: everyMs(Number(process.env.SCHEDULED_LOW_STOCK_HOURS || 6)) },
            jobId: 'scheduled-low-stock',
        },
    )

    logger.info('Scheduled repeat jobs registered')
}

// Bootstrap all queue workers (run in separate process via scripts/queue-worker.mjs).
export async function startWorkers() {
    if (!isQueueEnabled()) {
        logger.info('Queue workers not started — QUEUE_ENABLED is false or REDIS_URL missing')
        return []
    }

    const queueNames = Object.values(QUEUE_NAMES)
    for (const name of queueNames) {
        const workerConnection = await createQueueConnection()
        startWorker(name, workerConnection)
        logger.info('Worker listening', { queue: name })
    }

    await registerScheduledJobs()
    logger.info('All queue workers started', { count: workers.length })
    return workers
}

// Graceful shutdown for workers and Redis connection.
export async function stopWorkers() {
    for (const worker of workers) {
        await worker.close().catch(() => {})
    }
    workers.length = 0
}
