/**
 * Production deploy sanity checks: JWT, CORS, HTTPS cookies, etc. Warns unless STRICT_PRODUCTION=true.
 */
import { logger } from '../utils/logger.js';

export function runProductionChecks() {
    if (process.env.NODE_ENV !== 'production') return;

    const warnings = [];

    if (!process.env.SECRET_KEY_ACCESS_TOKEN || !process.env.SECRET_KEY_REFRESH_TOKEN) {
        warnings.push('JWT secrets must be set in production');
    }
    if (process.env.SECRET_KEY_ACCESS_TOKEN === process.env.SECRET_KEY_REFRESH_TOKEN) {
        warnings.push('Use different ACCESS and REFRESH secrets');
    }
    if (!process.env.CORS_ORIGINS && !process.env.CLIENT_URL) {
        warnings.push('Set CORS_ORIGINS or CLIENT_URL');
    }
    if (process.env.ALLOW_MOCK_PAYMENT === 'true') {
        warnings.push('ALLOW_MOCK_PAYMENT=true is unsafe for real customers');
    }
    if (!process.env.SENTRY_DSN) {
        warnings.push('Set SENTRY_DSN for error monitoring (recommended)');
    }
    if (process.env.TRUST_PROXY_HOPS === undefined) {
        warnings.push('Set TRUST_PROXY_HOPS=1 when behind nginx/Cloudflare');
    }

    for (const w of warnings) {
        logger.warn(`[production] ${w}`);
    }

    if (warnings.length && process.env.STRICT_PRODUCTION === 'true') {
        throw new Error(`Production config incomplete: ${warnings.join('; ')}`);
    }
}
