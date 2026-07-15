/**
 * Optional DB-backed email queue (EMAIL_USE_QUEUE); else send SMTP immediately.
 */
import { sendEmailDirect } from '../config/sendEmail.js';
import { enqueueEmail, fetchPendingEmails, markEmailSent, markEmailFailed } from '../models/emailQueue.model.js';
import { logger } from './logger.js';

export function isEmailQueueEnabled() {
    return process.env.EMAIL_USE_QUEUE === 'true';
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
