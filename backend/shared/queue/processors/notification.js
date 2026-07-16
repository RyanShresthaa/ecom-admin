import { createNotification } from '../../models/notification.model.js'
import { JOB_NAMES } from '../constants.js'

// Notification queue processor — persists admin in-app notifications.
export async function processNotificationJob(job) {
    if (job.name === JOB_NAMES.NOTIFICATION_CREATE) {
        const row = await createNotification(job.data || {})
        return { id: row?.id }
    }
    throw new Error(`Unknown notification job: ${job.name}`)
}
