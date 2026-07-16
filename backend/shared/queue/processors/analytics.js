import pool from '../../config/connectDB.js'
import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Analytics queue processor — lightweight event logging (extend to warehouse later).
export async function processAnalyticsJob(job) {
    if (job.name !== JOB_NAMES.ANALYTICS_TRACK) {
        throw new Error(`Unknown analytics job: ${job.name}`)
    }

    const { event, userId, meta } = job.data || {}
    logger.info('Analytics event', { event, userId })

    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, details, ip, user_agent, success)
             VALUES ($1, $2, $3::jsonb, $4, $5, true)`,
            [
                userId || null,
                `analytics.${event || 'unknown'}`,
                JSON.stringify(meta || {}),
                meta?.ip || null,
                meta?.userAgent || 'queue-worker',
            ],
        )
    } catch (e) {
        logger.warn('Analytics audit insert failed', { message: e.message })
    }

    return { tracked: event }
}
