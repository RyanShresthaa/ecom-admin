import { QUEUE_NAMES } from '../constants.js'
import { processEmailJob } from './email.js'
import { processPaymentWebhookJob } from './paymentWebhook.js'
import { processInventoryJob } from './inventory.js'
import { processImageProcessingJob } from './imageProcessing.js'
import { processNotificationJob } from './notification.js'
import { processInvoiceJob } from './invoice.js'
import { processRetryJob } from './retry.js'
import { processAnalyticsJob } from './analytics.js'
import { processCacheInvalidationJob } from './cacheInvalidation.js'
import { processScheduledJob } from './scheduled.js'
import {
    processRecommendationJob,
    processFraudDetectionJob,
    processMachineLearningJob,
    processWarehouseSyncJob,
    processSearchIndexJob,
} from './enterprise.js'

// Map queue name → processor function (receives BullMQ Job).
export const PROCESSORS = {
    [QUEUE_NAMES.EMAIL]: processEmailJob,
    [QUEUE_NAMES.PAYMENT_WEBHOOK]: processPaymentWebhookJob,
    [QUEUE_NAMES.INVENTORY]: processInventoryJob,
    [QUEUE_NAMES.IMAGE_PROCESSING]: processImageProcessingJob,
    [QUEUE_NAMES.NOTIFICATION]: processNotificationJob,
    [QUEUE_NAMES.INVOICE]: processInvoiceJob,
    [QUEUE_NAMES.RETRY]: processRetryJob,
    [QUEUE_NAMES.ANALYTICS]: processAnalyticsJob,
    [QUEUE_NAMES.CACHE_INVALIDATION]: processCacheInvalidationJob,
    [QUEUE_NAMES.SCHEDULED]: processScheduledJob,
    [QUEUE_NAMES.RECOMMENDATION]: processRecommendationJob,
    [QUEUE_NAMES.FRAUD_DETECTION]: processFraudDetectionJob,
    [QUEUE_NAMES.MACHINE_LEARNING]: processMachineLearningJob,
    [QUEUE_NAMES.WAREHOUSE_SYNC]: processWarehouseSyncJob,
    [QUEUE_NAMES.SEARCH_INDEX]: processSearchIndexJob,
}

export function getProcessor(queueName) {
    return PROCESSORS[queueName]
}
