/**
 * Optional email delivery — BullMQ (preferred) → PG queue (legacy) → inline SMTP.
 */
import { sendEmailDirect } from '../config/sendEmail.js';
import { enqueueEmail, fetchPendingEmails, markEmailSent, markEmailFailed } from '../models/emailQueue.model.js';
import { logger } from './logger.js';

// Legacy PG email queue flag (used when QUEUE_ENABLED=false).
export function isPgEmailQueueEnabled() {
    return process.env.EMAIL_USE_QUEUE === 'true';
}

// Prefer BullMQ email queue when QUEUE_ENABLED=true.
async function isBullEmailQueueEnabled() {
    try {
        const { isQueueEnabled } = await import('../queue/connection.js');
        return isQueueEnabled();
    } catch {
        return false;
    }
}

/** Send now or enqueue based on QUEUE_ENABLED / EMAIL_USE_QUEUE */
export async function deliverEmail(opts) {
    if (await isBullEmailQueueEnabled()) {
        const { queueEmail } = await import('../queue/enqueue.js');
        const result = await queueEmail(opts);
        return { queued: true, bullmq: true, ...result };
    }

    if (isPgEmailQueueEnabled()) {
        const id = await enqueueEmail(opts);
        return { queued: true, id };
    }

    await sendEmailDirect(opts);
    return { sent: true };
}

/** Process pending PG rows (legacy scripts/email-worker.mjs) */
export async function processEmailBatch(limit = 20) {
    const rows = await fetchPendingEmails(limit);
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
        try {
            await sendEmailDirect({
                sendTo: row.send_to,
                subject: row.subject,
                html: row.html,
                text: row.text,
            });
            await markEmailSent(row.id);
            sent += 1;
        } catch (e) {
            await markEmailFailed(row.id, e.message);
            failed += 1;
            logger.warn('Email queue send failed', { id: row.id, error: e.message });
        }
    }
    return { processed: rows.length, sent, failed };
}
