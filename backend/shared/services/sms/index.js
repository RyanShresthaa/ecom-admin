// SMS service sends transactional messages via Twilio REST API.
/**
 * Minimal Twilio SMS sender via REST API.
 * Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 */
// Send one SMS directly to Twilio or return config/error diagnostics.
export async function sendSmsDirect({ to, body }) {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const token = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_FROM_NUMBER?.trim();
    // Skip outbound send when Twilio credentials are not configured.
    if (!sid || !token || !from) {
        return { sent: false, reason: 'sms_not_configured' };
    }

    const payload = new URLSearchParams({
        To: String(to || '').trim(),
        From: from,
        Body: String(body || ''),
    });

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        return { sent: false, reason: `twilio_error_${resp.status}`, details: text };
    }
    return { sent: true };
}
