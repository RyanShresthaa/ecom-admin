import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Retry queue processor — re-dispatches a failed job to its original queue.
export async function processRetryJob(job) {
    if (job.name !== JOB_NAMES.RETRY_FAILED) {
        throw new Error(`Unknown retry job: ${job.name}`)
    }

    const { queueName, jobName, data } = job.data || {}
    if (!queueName || !jobName) {
        throw new Error('retry job requires queueName and jobName')
    }

    logger.info('Retrying failed job inline', { queueName, jobName })
    const { getProcessor } = await import('./registry.js')
    const processor = getProcessor(queueName)
    if (!processor) {
        throw new Error(`No processor registered for queue: ${queueName}`)
    }
    return processor({ name: jobName, data })
}
