/**
 * Startup env validation: DB credentials, JWT secrets, weak-secret guard. Throws on hard errors.
 */
import { getAccessSecret, getRefreshSecret } from './security.js';

const WEAK_SECRETS = new Set([
    'mysecretkey',
    'secret',
    'jwt_secret',
    'changeme',
    'your_secret_here',
]);

// Validate critical env vars for database, auth, and production safety.
export function validateEnv() {
    const errors = [];
    const warnings = [];

    const hasUrl =
        process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
    if (!hasUrl && (!process.env.DB_NAME || !process.env.DB_USER)) {
        errors.push('Database: set DATABASE_URL (Neon) or DB_NAME + DB_USER in .env');
    }

    const access = getAccessSecret();
    const refresh = getRefreshSecret();

    if (!access) {
        errors.push('Set SECRET_KEY_ACCESS_TOKEN or JWT_SECRET');
    } else if (access.length < 32) {
        warnings.push('ACCESS token secret should be at least 32 characters');
    }

    if (!refresh) {
        errors.push('Set SECRET_KEY_REFRESH_TOKEN or JWT_SECRET');
    } else if (refresh.length < 32) {
        warnings.push('REFRESH token secret should be at least 32 characters');
    }

    if (access && WEAK_SECRETS.has(access.toLowerCase())) {
        warnings.push('Replace default JWT/access secret with a strong random value');
    }

    if (
        process.env.NODE_ENV === 'production' &&
        access &&
        refresh &&
        access === refresh
    ) {
        warnings.push('Use different secrets for ACCESS and REFRESH tokens in production');
    }

    if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL && !process.env.CORS_ORIGINS) {
        errors.push('Production: set CLIENT_URL or CORS_ORIGINS for CORS');
    }

    // Print non-blocking misconfiguration warnings to aid local setup.
    for (const w of warnings) console.warn(`[env] ${w}`);
    if (errors.length) {
        // Print blocking errors and abort startup for unsafe config.
        errors.forEach((e) => console.error(`[env] ${e}`));
        throw new Error('Invalid environment configuration');
    }
}
