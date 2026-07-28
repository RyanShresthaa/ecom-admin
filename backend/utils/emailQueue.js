/**
 * Optional DB-backed email queue (EMAIL_USE_QUEUE); else send SMTP immediately.
 * Defaults to queue in production when EMAIL_USE_QUEUE is unset.
 */
import { sendEmailDirect } from '../config/sendEmail.js';
import { enqueueEmail, fetchPendingEmails, markEmailSent, markEmailFailed } from '../models/emailQueue.model.js';
import { logger } from './logger.js';

export function isEmailQueueEnabled() {
    const raw = process.env.EMAIL_USE_QUEUE;
    if (raw == null || String(raw).trim() === '') {
        return process.env.NODE_ENV === 'production';
    }
    return String(raw).toLowerCase() === 'true';
}

/** Send now or enqueue based on EMAIL_USE_QUEUE */
export async function deliverEmail(opts) {
    if (isEmailQueueEnabled()) {
        const id = await enqueueEmail(opts);
        return { queued: true, id };
    }
    await sendEmailDirect(opts);
    return { sent: true };
}

/** Always enqueue when possible — never blocks the request on SMTP RTT. */
export async function queueTransactionalEmail(opts) {
    try {
        const id = await enqueueEmail(opts);
        return { queued: true, id };
    } catch (err) {
        logger.warn('email_queue insert failed; falling back to async SMTP', {
            error: err?.message || String(err),
        });
        void sendEmailDirect(opts).catch((e) => {
            logger.warn('async SMTP fallback failed', { error: e?.message || String(e) });
        });
        return { queued: false, fallback: true };
    }
}

/** Process pending rows (used by scripts/email-worker.mjs) */
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
