/**
 * Minimal TOTP (RFC 6238) using Node crypto — no extra package.
 * Secrets stored as base32 strings on users.mfa_totp_secret.
 */
import crypto from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a Base32 secret used for TOTP enrollment.
export function generateTotpSecret(bytes = 20) {
    const buf = crypto.randomBytes(bytes);
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
    return output;
}

// Decode Base32 secret into binary key for HMAC.
function base32ToBuffer(secret) {
    const cleaned = String(secret || '')
        .toUpperCase()
        .replace(/=+$/, '')
        .replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (const ch of cleaned) {
        const idx = BASE32.indexOf(ch);
        if (idx < 0) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

// Generate RFC6238 TOTP code for a specific timestamp window.
export function generateTotpCode(secret, step = 30, digits = 6, at = Date.now()) {
    const counter = Math.floor(at / 1000 / step);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter & 0xffffffff, 4);
    const key = base32ToBuffer(secret);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return String(code % 10 ** digits).padStart(digits, '0');
}

// Verify user-provided TOTP code with clock skew tolerance.
export function verifyTotpCode(secret, code, { window = 1, step = 30 } = {}) {
    const expected = String(code || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(expected)) return false;
    const now = Date.now();
    for (let w = -window; w <= window; w++) {
        const at = now + w * step * 1000;
        if (generateTotpCode(secret, step, 6, at) === expected) return true;
    }
    return false;
}

// Build otpauth URI consumed by authenticator apps.
export function otpauthUri({ secret, email, issuer = 'Matina' }) {
    const label = encodeURIComponent(`${issuer}:${email}`);
    const iss = encodeURIComponent(issuer);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

// Hash backup codes before storing them in the database.
export function hashBackupCode(code) {
    return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

// Generate one-time MFA backup codes for account recovery.
export function generateBackupCodes(n = 8) {
    const codes = [];
    for (let i = 0; i < n; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}
