import { Queue } from 'bullmq'
import { QUEUE_NAMES } from './constants.js'
import { getQueueConnection, isQueueEnabled } from './connection.js'

const queues = new Map()

// Default retry/backoff and retention for all BullMQ jobs.
export const DEFAULT_JOB_OPTIONS = {
    attempts: Number(process.env.QUEUE_JOB_ATTEMPTS || 3),
    backoff: {
        type: 'exponential',
        delay: Number(process.env.QUEUE_BACKOFF_MS || 2000),
    },
    removeOnComplete: {
        count: Number(process.env.QUEUE_COMPLETE_KEEP || 1000),
        age: 24 * 3600,
    },
    removeOnFail: {
        count: Number(process.env.QUEUE_FAIL_KEEP || 5000),
        age: 7 * 24 * 3600,
    },
}

// Lazy singleton BullMQ Queue instance per queue name.
export async function getQueue(name) {
    if (!isQueueEnabled()) return null
    if (queues.has(name)) return queues.get(name)
    const connection = await getQueueConnection()
    if (!connection) return null
    const queue = new Queue(name, {
        connection,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
    })
    queues.set(name, queue)
    return queue
}

// All registered queues (for Bull Board and worker bootstrap).
export async function getAllQueues() {
    const names = Object.values(QUEUE_NAMES)
    const result = []
    for (const name of names) {
        const q = await getQueue(name)
        if (q) result.push(q)
    }
    return result
}

// Close all queue instances on shutdown.
export async function closeAllQueues() {
    for (const queue of queues.values()) {
        await queue.close().catch(() => {})
    }
    queues.clear()
}
