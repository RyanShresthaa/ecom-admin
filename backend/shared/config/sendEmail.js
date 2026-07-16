/**
 * Nodemailer transport from SMTP_* env; verifySmtp / sendEmailDirect for transactional mail.
 */
import nodemailer from 'nodemailer';

// Build SMTP transport from env vars; return null when email is not configured.
function getTransport() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST.trim(),
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER.trim(),
            pass: process.env.SMTP_PASS.trim(),
        },
    });
}

// Verify SMTP connectivity for startup checks or health diagnostics.
export async function verifySmtp() {
    const t = getTransport();
    if (!t) return { ok: false, reason: 'smtp_not_configured' };
    await t.verify();
    return { ok: true };
}

/** Sends immediately via SMTP (used by worker and when queue is off). */
// Send a transactional email directly through SMTP transport.
export async function sendEmailDirect({ sendTo, subject, html, text }) {
    const t = getTransport();
    if (!t) {
        throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
    await t.sendMail({
        from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER.trim(),
        to: sendTo,
        subject,
        text: text || subject,
        html,
    });
    return { sent: true };
}

/** Default export: queues when EMAIL_USE_QUEUE=true, else sends inline. */
// Route outgoing email through queue or direct delivery abstraction.
export default async function sendEmail(opts) {
    const { deliverEmail } = await import('../utils/emailQueue.js');
    return deliverEmail(opts);
}
