/**
 * Central security settings: CORS origins, Helmet, httpOnly cookie options, JWT secrets and TTLs.
 */
// Detect production mode to tighten API security defaults.
const isProduction = () => process.env.NODE_ENV === 'production';

// Parse comma-separated frontend origins allowed to call the API.
export function parseAllowedOrigins() {
    const raw =
        process.env.CORS_ORIGINS ||
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000';
    return raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
}

// Build CORS policy used by all backend routes.
export function getCorsOptions() {
    const allowedOrigins = parseAllowedOrigins();

    return {
        origin(origin, callback) {
            // Same-origin / Postman / server-to-server (no Origin header)
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'CSRF-Token'],
        exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
        maxAge: 86_400,
        optionsSuccessStatus: 204,
    };
}

// Configure Helmet headers for API hardening.
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

// Define shared cookie defaults for auth/session cookies.
const cookieBase = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
});

/** Short-lived session cookie */
// Build secure access-token cookie options for login/session routes.
export function getAccessCookieOptions() {
    const maxAgeMs = Number(process.env.ACCESS_TOKEN_MAX_AGE_MS || 15 * 60 * 1000);
    return {
        ...cookieBase(),
        path: '/',
        maxAge: maxAgeMs,
    };
}

/** Long-lived refresh — scoped to user auth routes only */
// Build refresh-token cookie options scoped to auth endpoints.
export function getRefreshCookieOptions() {
    const maxAgeMs = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);
    return {
        ...cookieBase(),
        path: '/api/user',
        maxAge: maxAgeMs,
    };
}

// Resolve access token lifetime used by JWT signing.
export function getAccessTokenExpiresIn() {
    // Dev default is longer so admin sessions survive API restarts / long pages.
    // Production still defaults to 15m unless ACCESS_TOKEN_EXPIRES is set.
    return (
        process.env.ACCESS_TOKEN_EXPIRES ||
        (process.env.NODE_ENV === 'production' ? '15m' : '8h')
    );
}

// Resolve refresh token lifetime used by JWT signing.
export function getRefreshTokenExpiresIn() {
    return process.env.REFRESH_TOKEN_EXPIRES || '7d';
}

// Resolve access-token signing secret from environment.
export function getAccessSecret() {
    return process.env.SECRET_KEY_ACCESS_TOKEN || process.env.JWT_SECRET;
}

// Resolve refresh-token signing secret from environment.
export function getRefreshSecret() {
    return process.env.SECRET_KEY_REFRESH_TOKEN || process.env.JWT_SECRET;
}

export const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };
