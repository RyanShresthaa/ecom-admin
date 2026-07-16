import { getProcessor } from './registry.js'

// Run a job synchronously when BullMQ is disabled.
export async function runJobInline(queueName, jobName, data) {
    const processor = getProcessor(queueName)
    if (!processor) {
        throw new Error(`No processor registered for queue: ${queueName}`)
    }
    return processor({ name: jobName, data })
}

// BullMQ worker entry — dispatches job to the correct processor.
export async function processJob(job) {
    const processor = getProcessor(job.queueName)
    if (!processor) {
        throw new Error(`No processor for queue: ${job.queueName}`)
    }
    return processor(job)
}

export { getProcessor } from './registry.js'
