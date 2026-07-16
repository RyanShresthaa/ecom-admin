import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Enterprise-scale queue stubs — ready to swap in real ML/search/fraud services.
export async function processRecommendationJob(job) {
    logger.info('Recommendation job (stub)', { name: job.name, data: job.data })
    return { stub: true, queue: 'recommendation' }
}

export async function processFraudDetectionJob(job) {
    logger.info('Fraud detection job (stub)', { name: job.name, data: job.data })
    return { stub: true, score: 0, queue: 'fraud-detection' }
}

export async function processMachineLearningJob(job) {
    logger.info('ML job (stub)', { name: job.name, data: job.data })
    return { stub: true, queue: 'machine-learning' }
}

export async function processWarehouseSyncJob(job) {
    logger.info('Warehouse sync job (stub)', { name: job.name, data: job.data })
    return { stub: true, queue: 'warehouse-sync' }
}

export async function processSearchIndexJob(job) {
    if (job.name === JOB_NAMES.SEARCH_REINDEX) {
        logger.info('Search reindex job (stub)', { data: job.data })
        return { stub: true, indexed: job.data?.productId || 'all' }
    }
    throw new Error(`Unknown search job: ${job.name}`)
}
