/**
 * Transactional email: prefer Resend (HTTPS) when RESEND_API_KEY is set,
 * otherwise Nodemailer SMTP (SMTP_*).
 *
 * Render free web services block outbound SMTP (25/465/587), so Gmail SMTP
 * works locally but fails in production unless you use Resend (or upgrade Render).
 */
import nodemailer from 'nodemailer';

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

function resolveFromAddress() {
    const raw =
        process.env.RESEND_FROM?.trim() ||
        process.env.SMTP_FROM?.trim() ||
        process.env.SMTP_USER?.trim() ||
        'Matina Crafts <onboarding@resend.dev>';
    return raw.includes('<') ? raw : `"Matina Crafts" <${raw}>`;
}

async function sendViaResend({ sendTo, subject, html, text }) {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) return null;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: resolveFromAddress(),
            to: [sendTo],
            subject,
            html,
            text: text || subject,
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend failed (${res.status}): ${body.slice(0, 240)}`);
    }
    return { sent: true, provider: 'resend' };
}

export async function verifySmtp() {
    if (process.env.RESEND_API_KEY?.trim()) {
        return { ok: true, provider: 'resend' };
    }
    const t = getTransport();
    if (!t) return { ok: false, reason: 'smtp_not_configured' };
    await t.verify();
    return { ok: true, provider: 'smtp' };
}

/** Sends immediately (Resend HTTPS or SMTP). Used by auth OTP and the email worker. */
export async function sendEmailDirect({ sendTo, subject, html, text }) {
    if (process.env.RESEND_API_KEY?.trim()) {
        return sendViaResend({ sendTo, subject, html, text });
    }

    const t = getTransport();
    if (!t) {
        throw new Error(
            'Email is not configured. Set RESEND_API_KEY (recommended on Render) or SMTP_HOST/SMTP_USER/SMTP_PASS.',
        );
    }
    await t.sendMail({
        from: resolveFromAddress(),
        to: sendTo,
        subject,
        text: text || subject,
        html,
    });
    return { sent: true, provider: 'smtp' };
}

/** Default export: queues when EMAIL_USE_QUEUE=true, else sends inline. */
export default async function sendEmail(opts) {
    const { deliverEmail } = await import('../utils/emailQueue.js');
    return deliverEmail(opts);
}
