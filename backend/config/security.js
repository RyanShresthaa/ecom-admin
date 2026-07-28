/**
 * Central security settings: CORS origins, Helmet, httpOnly cookie options, JWT secrets and TTLs.
 * Cookie maxAge and JWT expiresIn share one TTL source of truth per token type.
 */
import { logger } from '../utils/logger.js';

const isProduction = () => process.env.NODE_ENV === 'production';

const DEFAULT_ACCESS_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ACCESS_EXPIRES = '15m';
const DEFAULT_REFRESH_EXPIRES = '7d';

const DURATION_RE = /^(\d+)(ms|s|m|h|d)$/i;
const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parse jwt-style duration (`15m`, `7d`) or bare milliseconds string into ms. */
export function parseDurationToMs(value) {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) {
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    const m = DURATION_RE.exec(raw);
    if (!m) return null;
    const amount = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return amount * UNIT_MS[unit];
}

function readPositiveMsEnv(name) {
    const raw = process.env[name];
    if (raw == null || String(raw).trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
        logger.error(`[security] Invalid ${name}=${JSON.stringify(raw)}; expected positive number`);
        return null;
    }
    return n;
}

/**
 * Single TTL source: prefer EXPIRES string, else MAX_AGE_MS, else default.
 * Cookie maxAge and JWT lifetime both use this value.
 */
export function resolveTokenTtlMs({ expiresEnv, maxAgeEnv, defaultMs, label }) {
    const fromExpires = parseDurationToMs(process.env[expiresEnv]);
    const fromMaxAge = readPositiveMsEnv(maxAgeEnv);

    if (fromExpires != null) {
        if (fromMaxAge != null && fromMaxAge !== fromExpires) {
            logger.error(
                `[security] ${maxAgeEnv} (${fromMaxAge}) differs from ${expiresEnv} (${fromExpires}ms); using ${expiresEnv} as source of truth`,
            );
        }
        return fromExpires;
    }

    if (fromMaxAge != null) return fromMaxAge;

    logger.error(
        `[security] Missing/invalid ${expiresEnv} and ${maxAgeEnv} for ${label}; using default ${defaultMs}ms`,
    );
    return defaultMs;
}

export function getAccessTokenTtlMs() {
    return resolveTokenTtlMs({
        expiresEnv: 'ACCESS_TOKEN_EXPIRES',
        maxAgeEnv: 'ACCESS_TOKEN_MAX_AGE_MS',
        defaultMs: DEFAULT_ACCESS_MS,
        label: 'access token',
    });
}

export function getRefreshTokenTtlMs() {
    return resolveTokenTtlMs({
        expiresEnv: 'REFRESH_TOKEN_EXPIRES',
        maxAgeEnv: 'REFRESH_TOKEN_MAX_AGE_MS',
        defaultMs: DEFAULT_REFRESH_MS,
        label: 'refresh token',
    });
}

/** jwt.sign expiresIn — seconds when driven by TTL ms (keeps cookie + JWT in sync). */
export function getAccessTokenExpiresIn() {
    const ttl = getAccessTokenTtlMs();
    return Math.max(1, Math.floor(ttl / 1000));
}

export function getRefreshTokenExpiresIn() {
    const ttl = getRefreshTokenTtlMs();
    return Math.max(1, Math.floor(ttl / 1000));
}

/** @deprecated Prefer getAccessTokenTtlMs; kept for callers expecting string env. */
export function getAccessTokenExpiresInRaw() {
    return process.env.ACCESS_TOKEN_EXPIRES || DEFAULT_ACCESS_EXPIRES;
}

/** @deprecated Prefer getRefreshTokenTtlMs */
export function getRefreshTokenExpiresInRaw() {
    return process.env.REFRESH_TOKEN_EXPIRES || DEFAULT_REFRESH_EXPIRES;
}

/**
 * Normalize an Origin / URL for CORS comparison.
 * Handles trailing slash, host casing, whitespace; rejects invalid values.
 */
export function normalizeOrigin(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === 'null') return null;
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        // Origins only — reject paths (other than `/`), query, or hash
        const pathOnly = (url.pathname || '/').replace(/\/+$/, '') || '';
        if (pathOnly !== '' || url.search || url.hash) return null;
        const host = url.hostname.toLowerCase();
        const port = url.port ? `:${url.port}` : '';
        return `${url.protocol}//${host}${port}`;
    } catch {
        return null;
    }
}

export function parseAllowedOrigins() {
    const raw =
        process.env.CORS_ORIGINS ||
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000';

    const seen = new Set();
    const origins = [];
    const invalid = [];

    for (const part of String(raw).split(',')) {
        const piece = part.trim();
        if (!piece) continue;
        const normalized = normalizeOrigin(piece);
        if (!normalized) {
            invalid.push(piece);
            continue;
        }
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        origins.push(normalized);
    }

    if (invalid.length) {
        logger.error(`[cors] Rejected invalid origin entries: ${invalid.join(', ')}`);
    }
    if (!origins.length) {
        logger.error('[cors] No valid origins configured; falling back to http://localhost:3000');
        return ['http://localhost:3000'];
    }
    return origins;
}

export function isOriginAllowed(origin, allowedOrigins = parseAllowedOrigins()) {
    if (origin == null || origin === '') return { allowed: true, reason: 'missing_origin' };
    if (origin === 'null') {
        return { allowed: false, reason: 'null_origin' };
    }
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
        return { allowed: false, reason: 'invalid_origin' };
    }
    if (allowedOrigins.includes(normalized)) {
        return { allowed: true, reason: 'allowlist', origin: normalized };
    }
    return { allowed: false, reason: 'not_allowlisted', origin: normalized };
}

export function getCorsOptions() {
    const allowedOrigins = parseAllowedOrigins();

    return {
        origin(origin, callback) {
            const result = isOriginAllowed(origin, allowedOrigins);
            if (result.allowed) {
                return callback(null, true);
            }
            logger.warn('[cors] Blocked origin', {
                origin: origin || '(empty)',
                reason: result.reason,
                allowlist: allowedOrigins,
            });
            callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-CSRF-Token',
            'CSRF-Token',
            'Idempotency-Key',
        ],
        exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
        maxAge: 86_400,
        optionsSuccessStatus: 204,
    };
}

export function getHelmetOptions() {
    return {
        contentSecurityPolicy: isProduction(),
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: isProduction()
            ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
            : false,
    };
}

/** Rough eTLD+1 for SameSite detection (no full PSL). */
export function registrableDomain(hostname) {
    const host = String(hostname || '').toLowerCase();
    if (!host) return '';
    if (host === 'localhost' || host.endsWith('.localhost')) return 'localhost';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    return parts.slice(-2).join('.');
}

export function isSameSitePair(originA, originB) {
    try {
        const a = new URL(originA);
        const b = new URL(originB);
        if (a.protocol !== b.protocol) return false;
        return registrableDomain(a.hostname) === registrableDomain(b.hostname);
    } catch {
        return false;
    }
}

function resolveApiPublicOrigin() {
    const candidates = [
        process.env.API_PUBLIC_ORIGIN,
        process.env.BACKEND_PUBLIC_URL,
        process.env.API_URL,
    ];
    for (const c of candidates) {
        const n = normalizeOrigin(c);
        if (n) return n;
    }
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}`;
}

/**
 * SameSite=Lax when API and all frontends are same-site; None only when cross-site.
 * Override with COOKIE_SAMESITE=lax|none|strict.
 */
export function resolveCookieSameSite() {
    const override = String(process.env.COOKIE_SAMESITE || '')
        .trim()
        .toLowerCase();
    if (override === 'lax' || override === 'none' || override === 'strict') {
        return override;
    }

    const apiOrigin = resolveApiPublicOrigin();
    const frontends = parseAllowedOrigins();
    const crossSite = frontends.some((o) => !isSameSitePair(apiOrigin, o));

    if (crossSite) {
        if (!isProduction()) {
            logger.warn(
                '[security] Cross-site frontend detected; using SameSite=None requires Secure (prod HTTPS)',
            );
        }
        return 'none';
    }
    return 'lax';
}

/**
 * Optional Domain= for cookie sharing across API host aliases.
 * Default: omit (host-only) — safest; do not set to parent eTLD+1 unless required.
 */
export function resolveCookieDomain() {
    const raw = String(process.env.COOKIE_DOMAIN || '').trim();
    if (!raw) return undefined;
    // Reject values that look like full origins / paths
    if (/[/:\\s]/.test(raw) || raw.includes('://')) {
        logger.error(`[security] Invalid COOKIE_DOMAIN=${JSON.stringify(raw)}; ignoring`);
        return undefined;
    }
    return raw;
}

/**
 * CHIPS `Partitioned` attribute — only for third-party (cross-site) Secure cookies.
 *
 * Env `COOKIE_PARTITIONED`:
 * - `auto` (default): enable only when NODE_ENV=production AND SameSite=None AND Secure
 * - `true` / `1`: enable whenever SameSite=None AND Secure (incl. local cross-site HTTPS)
 * - `false` / `0`: never set Partitioned (Safari-safe / legacy clearCookie compatibility)
 *
 * Browser notes:
 * - Chrome / Edge: honor Partitioned (CHIPS) for third-party contexts
 * - Firefox: ignores or partially supports; unrecognized attrs are ignored (safe)
 * - Safari: does not rely on CHIPS for ITP; prefer same-site subdomains instead of None
 */
export function shouldUsePartitionedCookies({ sameSite, secure } = {}) {
    const site = sameSite ?? resolveCookieSameSite();
    const isSecure = secure ?? (isProduction() || site === 'none');
    if (site !== 'none' || !isSecure) return false;

    const raw = String(process.env.COOKIE_PARTITIONED || 'auto')
        .trim()
        .toLowerCase();
    if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return false;
    if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes') return true;
    // auto
    return isProduction();
}

const cookieBase = () => {
    const sameSite = resolveCookieSameSite();
    // Secure required in production HTTPS and whenever SameSite=None (browser rule).
    const secure = isProduction() || sameSite === 'none';
    const domain = resolveCookieDomain();
    const partitioned = shouldUsePartitionedCookies({ sameSite, secure });
    return {
        httpOnly: true,
        secure,
        sameSite,
        ...(domain ? { domain } : {}),
        ...(partitioned ? { partitioned: true } : {}),
    };
};

/** Short-lived session cookie — maxAge matches access JWT TTL; Expires set by Express from maxAge */
export function getAccessCookieOptions() {
    return {
        ...cookieBase(),
        path: '/',
        maxAge: getAccessTokenTtlMs(),
    };
}

/** Long-lived refresh — scoped to user auth routes; maxAge matches refresh JWT TTL */
export function getRefreshCookieOptions() {
    return {
        ...cookieBase(),
        path: '/api/user',
        maxAge: getRefreshTokenTtlMs(),
    };
}

/**
 * Double-submit CSRF cookie (readable by JS).
 * maxAge follows refresh TTL so CSRF survives access expiry until /refresh-token rotates it.
 */
export function getCsrfCookieOptions() {
    const base = cookieBase();
    return {
        httpOnly: false,
        secure: base.secure,
        sameSite: base.sameSite,
        path: '/',
        maxAge: getRefreshTokenTtlMs(),
        ...(base.domain ? { domain: base.domain } : {}),
        ...(base.partitioned ? { partitioned: true } : {}),
    };
}

/** Options for clearCookie / expire — must mirror Path/Secure/SameSite/Domain used at set time. */
function clearOptsFrom(setOpts, { httpOnly } = {}) {
    const { maxAge: _max, ...rest } = setOpts;
    return {
        ...rest,
        ...(httpOnly === undefined ? {} : { httpOnly }),
        maxAge: 0,
        expires: new Date(0),
    };
}

export function getClearAccessCookieOptions() {
    return clearOptsFrom(getAccessCookieOptions());
}

export function getClearRefreshCookieOptions() {
    return clearOptsFrom(getRefreshCookieOptions());
}

export function getClearCsrfCookieOptions() {
    return clearOptsFrom(getCsrfCookieOptions(), { httpOnly: false });
}

export function getAccessSecret() {
    return process.env.SECRET_KEY_ACCESS_TOKEN || process.env.JWT_SECRET;
}

export function getRefreshSecret() {
    return process.env.SECRET_KEY_REFRESH_TOKEN || process.env.JWT_SECRET;
}

export const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };

/** Safe frontend base for email links — must be an allowlisted origin. */
export function getTrustedFrontendBaseUrl() {
    const candidates = [process.env.FRONTEND_URL, process.env.CLIENT_URL, ...parseAllowedOrigins()];
    const allow = new Set(parseAllowedOrigins());
    for (const c of candidates) {
        const n = normalizeOrigin(c);
        if (n && allow.has(n)) return n;
    }
    return allow.values().next().value || 'http://localhost:3000';
}
