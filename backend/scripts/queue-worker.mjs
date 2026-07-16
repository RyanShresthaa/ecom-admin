/**
 * BullMQ worker process — drains all background job queues.
 *
 *   npm run queue:worker
 *
 * Requires: REDIS_URL + QUEUE_ENABLED=true
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { isQueueEnabled } = await import('../shared/queue/connection.js')
const { startWorkers, stopWorkers } = await import('../shared/queue/workers.js')
const { closeQueueConnection } = await import('../shared/queue/connection.js')
const { closeAllQueues } = await import('../shared/queue/queues.js')
const { logger } = await import('../shared/utils/logger.js')

if (!isQueueEnabled()) {
    console.error('QUEUE_ENABLED must be true and REDIS_URL must be set.')
    process.exit(1)
}

await startWorkers()
logger.info('Queue worker process running — Ctrl+C to stop')

async function shutdown() {
    logger.info('Shutting down queue workers…')
    await stopWorkers()
    await closeAllQueues()
    await closeQueueConnection()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
