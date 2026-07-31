/**
 * Transactional email: prefer Resend (HTTPS) when RESEND_API_KEY is set,
 * otherwise Nodemailer SMTP (SMTP_*).
 *
 * Render free web services block outbound SMTP (25/465/587), so Gmail SMTP
 * works locally but fails in production unless you use Resend (or upgrade Render).
 */
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

function stripWrappingQuotes(value) {
    const s = String(value || '').trim();
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        return s.slice(1, -1).trim();
    }
    return s;
}

function getResendApiKey() {
    return stripWrappingQuotes(process.env.RESEND_API_KEY || '');
}

/** Which transport will be used (no secrets). Safe for /api/health. */
export function getEmailProviderInfo() {
    const resend = Boolean(getResendApiKey());
    const smtp = Boolean(
        process.env.SMTP_HOST?.trim() &&
            process.env.SMTP_USER?.trim() &&
            process.env.SMTP_PASS?.trim(),
    );
    return {
        provider: resend ? 'resend' : smtp ? 'smtp' : 'none',
        resendConfigured: resend,
        smtpConfigured: smtp,
        from: resend
            ? stripWrappingQuotes(process.env.RESEND_FROM || '') || 'onboarding@resend.dev'
            : stripWrappingQuotes(process.env.SMTP_FROM || process.env.SMTP_USER || '') || null,
    };
}

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

function resolveFromAddress(preferResend) {
    if (preferResend) {
        const raw =
            stripWrappingQuotes(process.env.RESEND_FROM || '') ||
            'Matina Crafts <onboarding@resend.dev>';
        return raw.includes('<') ? raw : `"Matina Crafts" <${raw}>`;
    }
    const raw =
        stripWrappingQuotes(process.env.SMTP_FROM || '') ||
        stripWrappingQuotes(process.env.SMTP_USER || '') ||
        'Matina Crafts <onboarding@resend.dev>';
    return raw.includes('<') ? raw : `"Matina Crafts" <${raw}>`;
}

async function sendViaResend({ sendTo, subject, html, text }) {
    const key = getResendApiKey();
    if (!key) return null;

    const primaryFrom = resolveFromAddress(true);
    const fallbackFrom = 'Matina Crafts <onboarding@resend.dev>';

    const attempt = async (from) => {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [sendTo],
                subject,
                html,
                text: text || subject,
            }),
        });
        const body = await res.text().catch(() => '');
        return { res, body };
    };

    let { res, body } = await attempt(primaryFrom);

    // Unverified custom domain → retry with Resend's test sender (works without DNS).
    const domainUnverified =
        res.status === 403 && /domain is not verified/i.test(body);
    if (domainUnverified && primaryFrom !== fallbackFrom) {
        logger.warn('resend_domain_unverified_retrying_onboarding', { from: primaryFrom });
        ({ res, body } = await attempt(fallbackFrom));
    }

    if (!res.ok) {
        throw new Error(`Resend failed (${res.status}): ${body.slice(0, 240)}`);
    }
    logger.info('email_sent', {
        provider: 'resend',
        to: sendTo,
        from: domainUnverified ? fallbackFrom : primaryFrom,
    });
    return { sent: true, provider: 'resend' };
}

export async function verifySmtp() {
    if (getResendApiKey()) {
        return { ok: true, provider: 'resend' };
    }
    const t = getTransport();
    if (!t) return { ok: false, reason: 'smtp_not_configured' };
    await t.verify();
    return { ok: true, provider: 'smtp' };
}

/**
 * Sends immediately.
 * If RESEND_API_KEY is set, SMTP is never used (avoids silent Gmail sends / Render SMTP blocks).
 */
export async function sendEmailDirect({ sendTo, subject, html, text }) {
    if (getResendApiKey()) {
        return sendViaResend({ sendTo, subject, html, text });
    }

    const t = getTransport();
    if (!t) {
        throw new Error(
            'Email is not configured. Set RESEND_API_KEY (required on Render free tier) or SMTP_HOST/SMTP_USER/SMTP_PASS.',
        );
    }
    const from = resolveFromAddress(false);
    await t.sendMail({
        from,
        to: sendTo,
        subject,
        text: text || subject,
        html,
    });
    logger.info('email_sent', { provider: 'smtp', to: sendTo, from });
    return { sent: true, provider: 'smtp' };
}

/** Default export: queues when EMAIL_USE_QUEUE=true, else sends inline. */
export default async function sendEmail(opts) {
    const { deliverEmail } = await import('../utils/emailQueue.js');
    return deliverEmail(opts);
}
