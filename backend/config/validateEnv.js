/**
 * Startup env validation: DB credentials, JWT secrets, weak-secret guard. Throws on hard errors.
 * Production: secret length/identity/weakness are fatal (not warnings).
 */
import os from 'os';
import { getAccessSecret, getRefreshSecret } from './security.js';
import { validateBcryptCostEnv, getBcryptCost } from '../utils/passwordHash.js';

const WEAK_SECRETS = new Set([
    'mysecretkey',
    'secret',
    'jwt_secret',
    'changeme',
    'your_secret_here',
    'password',
    '12345678901234567890123456789012',
]);

function isWeakSecret(value) {
    if (!value) return true;
    const lower = value.toLowerCase();
    if (WEAK_SECRETS.has(lower)) return true;
    if (/^(.)\1+$/.test(value)) return true;
    if (/^(0123456789|abcdefghij|qwertyuiop)/i.test(value)) return true;
    return false;
}

/** UV_THREADPOOL_SIZE must be set in the process environment before Node starts (not in app code). */
export function validateUvThreadpoolEnv({ production: _production } = {}) {
    const warnings = [];
    const raw = process.env.UV_THREADPOOL_SIZE;
    const cpus = os.cpus()?.length || 4;

    if (raw == null || String(raw).trim() === '') {
        warnings.push(
            'UV_THREADPOOL_SIZE unset (libuv default 4). For login-heavy hosts set 8–16 in the process manager / Dockerfile ENV before starting Node — cannot be changed at runtime.',
        );
        return warnings;
    }

    const n = Number(raw);
    if (!Number.isInteger(n) || n < 4) {
        warnings.push(
            `UV_THREADPOOL_SIZE=${JSON.stringify(raw)} is invalid; use an integer >= 4 (recommended 8–${Math.max(8, cpus)})`,
        );
        return warnings;
    }
    if (n > cpus * 2) {
        warnings.push(
            `UV_THREADPOOL_SIZE=${n} is high for ${cpus} CPUs; prefer <= ${cpus * 2} to avoid oversubscription`,
        );
    }
    return warnings;
}

export function validateEnv() {
    const errors = [];
    const warnings = [];
    const production = process.env.NODE_ENV === 'production';

    if (!process.env.DB_NAME || !process.env.DB_USER) {
        errors.push('Database: set DB_NAME and DB_USER in .env');
    }

    const access = getAccessSecret();
    const refresh = getRefreshSecret();
    const accessExplicit = process.env.SECRET_KEY_ACCESS_TOKEN;
    const refreshExplicit = process.env.SECRET_KEY_REFRESH_TOKEN;
    const jwtSecret = process.env.JWT_SECRET;

    if (!access) {
        errors.push('Set SECRET_KEY_ACCESS_TOKEN or JWT_SECRET');
    }
    if (!refresh) {
        errors.push('Set SECRET_KEY_REFRESH_TOKEN or JWT_SECRET');
    }

    const pushSecretIssue = (msg) => {
        if (production) errors.push(msg);
        else warnings.push(msg);
    };

    if (access && access.length < 32) {
        pushSecretIssue('ACCESS token secret must be at least 32 characters');
    }
    if (refresh && refresh.length < 32) {
        pushSecretIssue('REFRESH token secret must be at least 32 characters');
    }

    if (access && isWeakSecret(access)) {
        pushSecretIssue('Replace weak/default ACCESS token secret with a strong random value');
    }
    if (refresh && isWeakSecret(refresh)) {
        pushSecretIssue('Replace weak/default REFRESH token secret with a strong random value');
    }

    if (access && refresh && access === refresh) {
        pushSecretIssue('ACCESS and REFRESH secrets must be different');
    }

    if (
        jwtSecret &&
        access === jwtSecret &&
        refresh === jwtSecret &&
        (!accessExplicit || !refreshExplicit)
    ) {
        pushSecretIssue(
            'Do not reuse JWT_SECRET for both access and refresh; set distinct SECRET_KEY_ACCESS_TOKEN and SECRET_KEY_REFRESH_TOKEN',
        );
    }

    const bcryptErr = validateBcryptCostEnv();
    if (bcryptErr) {
        errors.push(bcryptErr);
    } else {
        try {
            const cost = getBcryptCost();
            if (production && cost < 12) {
                warnings.push(
                    `BCRYPT_COST=${cost}: consider 12 on production CPUs where serial compare stays under ~400ms (login rehash upgrades old hashes)`,
                );
            }
        } catch {
            /* already handled */
        }
    }

    warnings.push(...validateUvThreadpoolEnv({ production }));

    if (production && !process.env.CLIENT_URL && !process.env.CORS_ORIGINS) {
        errors.push('Production: set CLIENT_URL or CORS_ORIGINS for CORS');
    }

    for (const w of warnings) console.warn(`[env] ${w}`);
    if (errors.length) {
        errors.forEach((e) => console.error(`[env] ${e}`));
        throw new Error('Invalid environment configuration');
    }
}
