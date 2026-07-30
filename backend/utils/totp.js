/**
 * TOTP helpers (authenticator apps) using `otpauth`.
 */
import { Secret, TOTP } from 'otpauth';
import crypto from 'crypto';

const ISSUER = process.env.TOTP_ISSUER || 'Matina Crafts';

export function generateTotpSecret() {
    return new Secret({ size: 20 });
}

export function buildTotp({ secret, label }) {
    const sec = typeof secret === 'string' ? Secret.fromBase32(secret) : secret;
    return new TOTP({
        issuer: ISSUER,
        label: String(label || 'Account'),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: sec,
    });
}

export function totpKeyUri(secretBase32, email) {
    return buildTotp({ secret: secretBase32, label: email }).toString();
}

export function verifyTotpCode(secretBase32, code) {
    const token = String(code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(token)) return false;
    try {
        const totp = buildTotp({ secret: secretBase32, label: 'verify' });
        const delta = totp.validate({ token, window: 1 });
        return delta !== null;
    } catch {
        return false;
    }
}

/** Short-lived JWT payload helpers live in the controller; this is only entropy for secrets. */
export function randomBase32Secret() {
    return generateTotpSecret().base32;
}

export function timingSafeEqualCode(a, b) {
    const aa = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (aa.length !== bb.length) return false;
    return crypto.timingSafeEqual(aa, bb);
}
