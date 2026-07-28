/**
 * Production deploy sanity checks: JWT, CORS, HTTPS cookies, etc.
 * Critical JWT/CORS issues throw; non-critical items warn (or throw if STRICT_PRODUCTION=true).
 */
import { logger } from '../utils/logger.js';
import {
    getAccessSecret,
    getRefreshSecret,
    getAccessCookieOptions,
    getRefreshCookieOptions,
    resolveCookieSameSite,
} from './security.js';

export function runProductionChecks() {
    if (process.env.NODE_ENV !== 'production') return;

    const errors = [];
    const warnings = [];

    const access = getAccessSecret();
    const refresh = getRefreshSecret();

    if (!process.env.SECRET_KEY_ACCESS_TOKEN || !process.env.SECRET_KEY_REFRESH_TOKEN) {
        errors.push('JWT secrets must be set via SECRET_KEY_ACCESS_TOKEN and SECRET_KEY_REFRESH_TOKEN in production');
    }
    if (access && refresh && access === refresh) {
        errors.push('Use different ACCESS and REFRESH secrets');
    }
    if (!process.env.CORS_ORIGINS && !process.env.CLIENT_URL) {
        errors.push('Set CORS_ORIGINS or CLIENT_URL');
    }
    if (process.env.ALLOW_MOCK_PAYMENT === 'true') {
        warnings.push('ALLOW_MOCK_PAYMENT=true is unsafe for real customers');
    }
    if (
        process.env.E2E_RELAX_RATE_LIMIT === 'true' ||
        process.env.LOAD_TEST_BYPASS === '1'
    ) {
        errors.push(
            'E2E_RELAX_RATE_LIMIT / LOAD_TEST_BYPASS must not be enabled in production (disables rate limits)',
        );
    }
    if (!process.env.SENTRY_DSN) {
        warnings.push('Set SENTRY_DSN for error monitoring (recommended)');
    }
    if (!process.env.METRICS_BEARER_TOKEN && process.env.METRICS_ALLOW_INSECURE !== 'true') {
        errors.push(
            'Set METRICS_BEARER_TOKEN to protect /metrics (or METRICS_ALLOW_INSECURE=true for private meshes only)',
        );
    }
    if (process.env.METRICS_ALLOW_INSECURE === 'true') {
        warnings.push('METRICS_ALLOW_INSECURE=true — /metrics may be scraped without a bearer token');
    }

    const redisUrl = process.env.REDIS_URL || process.env.RATE_LIMIT_REDIS_URL;
    const multiInstanceHint =
        Number(process.env.WEB_CONCURRENCY || process.env.INSTANCES || 0) > 1 ||
        process.env.PM2_CLUSTER === 'true' ||
        process.env.RATE_LIMIT_REQUIRE_REDIS === 'true';
    if (!redisUrl) {
        if (multiInstanceHint || process.env.RATE_LIMIT_REQUIRE_REDIS === 'true') {
            errors.push(
                'Set REDIS_URL for cluster-wide rate limits (or unset RATE_LIMIT_REQUIRE_REDIS / multi-instance flags)',
            );
        } else {
            warnings.push(
                'REDIS_URL unset — rate limits are per-process; set REDIS_URL when running multiple API replicas',
            );
        }
    }
    if (process.env.ENABLE_SWAGGER === 'true') {
        warnings.push('ENABLE_SWAGGER=true exposes /api/docs publicly — restrict via nginx or disable');
    }
    if (process.env.TRUST_PROXY_HOPS === undefined) {
        warnings.push('Set TRUST_PROXY_HOPS=1 when behind nginx/Cloudflare');
    }
    if (!process.env.UV_THREADPOOL_SIZE) {
        warnings.push(
            'Set UV_THREADPOOL_SIZE=8 (or up to CPU count) in the process environment before starting Node — required for concurrent bcrypt/login throughput',
        );
    }
    if (!process.env.BCRYPT_COST) {
        warnings.push('Set BCRYPT_COST explicitly in production (recommended 12 on capable hosts; allowed 10–15)');
    }

    const accessCookie = getAccessCookieOptions();
    const refreshCookie = getRefreshCookieOptions();
    if (!accessCookie.secure || !refreshCookie.secure) {
        errors.push('Production cookies must set Secure (serve API over HTTPS)');
    }
    if (accessCookie.httpOnly !== true || refreshCookie.httpOnly !== true) {
        errors.push('accessToken/refreshToken cookies must be HttpOnly');
    }
    if (resolveCookieSameSite() === 'none' && !accessCookie.partitioned) {
        warnings.push(
            'SameSite=None without Partitioned: set COOKIE_PARTITIONED=auto|true for Chrome/Edge CHIPS, or use same-site subdomains',
        );
    }
    if (resolveCookieSameSite() === 'none') {
        warnings.push(
            'Cross-site cookies (SameSite=None): prefer same-site subdomains (shop.example.com + api.example.com) for Safari ITP',
        );
    }
    if (process.env.API_PUBLIC_ORIGIN == null || String(process.env.API_PUBLIC_ORIGIN).trim() === '') {
        warnings.push('Set API_PUBLIC_ORIGIN to the public HTTPS origin of this API (SameSite auto-detect)');
    }

    const dbHost = process.env.DB_HOST || '';
    const localDb = !dbHost || dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === 'db';
    if (!localDb && !process.env.DB_SSL) {
        warnings.push('Set DB_SSL=require for managed PostgreSQL (TLS)');
    }

    for (const w of warnings) {
        logger.warn(`[production] ${w}`);
    }

    if (errors.length) {
        throw new Error(`Production config incomplete: ${errors.join('; ')}`);
    }

    if (warnings.length && process.env.STRICT_PRODUCTION === 'true') {
        throw new Error(`Production config incomplete: ${warnings.join('; ')}`);
    }
}

