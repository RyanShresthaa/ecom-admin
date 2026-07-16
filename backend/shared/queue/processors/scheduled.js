import pool from '../../config/connectDB.js'
import { queueEmail, queueInventoryNotificationSync } from '../enqueue.js'
import { JOB_NAMES } from '../constants.js'

// Scheduled jobs processor — cart reminders, coupon expiry, low-stock scans.
export async function processScheduledJob(job) {
    switch (job.name) {
        case JOB_NAMES.SCHEDULED_CART_REMINDERS: {
            const r = await pool.query(
                `SELECT DISTINCT u.email, u.name, u.id
                 FROM cart_items c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.updated_at < NOW() - INTERVAL '2 days'
                   AND u.email IS NOT NULL
                 LIMIT 50`,
            )
            let sent = 0
            for (const row of r.rows) {
                await queueEmail({
                    sendTo: row.email,
                    subject: 'Items waiting in your cart',
                    html: `<p>Hi ${row.name || 'there'},</p><p>You still have items in your cart. Come back to complete your order!</p>`,
                })
                sent += 1
            }
            return { reminders: sent }
        }
        case JOB_NAMES.SCHEDULED_COUPON_EXPIRY: {
            const r = await pool.query(
                `UPDATE coupons SET active = false
                 WHERE expires_at < NOW() AND active = true
                 RETURNING id`,
            )
            return { expired: r.rowCount }
        }
        case JOB_NAMES.SCHEDULED_LOW_STOCK: {
            await queueInventoryNotificationSync()
            return { triggered: true }
        }
        default:
            throw new Error(`Unknown scheduled job: ${job.name}`)
    }
}
