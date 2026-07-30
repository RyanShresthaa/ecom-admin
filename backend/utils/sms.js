/**
 * Twilio SMS sender. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * (or TWILIO_MESSAGING_SERVICE_SID). Until configured, messages are logged and skipped.
 */
import { logger } from './logger.js';

export function isTwilioConfigured() {
    const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
    const from =
        String(process.env.TWILIO_FROM_NUMBER || '').trim() ||
        String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
    return Boolean(sid && token && from);
}

function normalizePhone(mobile) {
    const raw = String(mobile || '').replace(/[^\d+]/g, '');
    if (!raw) return null;
    if (raw.startsWith('+')) return raw;
    // US default if 10 digits
    if (/^\d{10}$/.test(raw)) return `+1${raw}`;
    if (/^\d{11,15}$/.test(raw)) return `+${raw}`;
    return null;
}

/**
 * @returns {{ ok: boolean, skipped?: boolean, sid?: string, error?: string }}
 */
export async function sendSms({ to, body }) {
    const phone = normalizePhone(to);
    const text = String(body || '').trim();
    if (!phone || !text) {
        return { ok: false, error: 'Missing phone or message body' };
    }

    if (!isTwilioConfigured()) {
        logger.info('[sms] Twilio not configured — skipping SMS', {
            to: phone,
            preview: text.slice(0, 80),
        });
        return { ok: true, skipped: true };
    }

    const sid = process.env.TWILIO_ACCOUNT_SID.trim();
    const token = process.env.TWILIO_AUTH_TOKEN.trim();
    const fromNumber = String(process.env.TWILIO_FROM_NUMBER || '').trim();
    const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();

    const params = new URLSearchParams();
    params.set('To', phone);
    params.set('Body', text.slice(0, 1500));
    if (messagingServiceSid) {
        params.set('MessagingServiceSid', messagingServiceSid);
    } else {
        params.set('From', fromNumber);
    }

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    try {
        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = json?.message || `Twilio HTTP ${res.status}`;
            logger.warn('[sms] Twilio send failed', { to: phone, err });
            return { ok: false, error: err };
        }
        return { ok: true, sid: json.sid };
    } catch (e) {
        logger.warn('[sms] Twilio request error', e.message);
        return { ok: false, error: e.message };
    }
}
