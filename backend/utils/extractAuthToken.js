/**
 * Extract access / refresh JWTs from cookies or Authorization: Bearer.
 * Rejects legacy `token` cookie and malformed Authorization headers.
 */

/**
 * @param {import('express').Request} req
 * @returns {{ token: string|null, source: 'cookie'|'bearer'|null, error?: string }}
 */
export function extractAccessToken(req) {
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
        return { token: String(cookieToken), source: 'cookie' };
    }

    const header = req.headers?.authorization;
    if (header == null || header === '') {
        return { token: null, source: null };
    }
    if (typeof header !== 'string') {
        return { token: null, source: null, error: 'malformed_authorization' };
    }

    const trimmed = header.trim();
    const match = /^Bearer\s+(\S+)$/i.exec(trimmed);
    if (!match) {
        return { token: null, source: null, error: 'malformed_authorization' };
    }
    return { token: match[1], source: 'bearer' };
}

/**
 * Refresh tokens come from the refreshToken cookie (preferred) or Bearer on the refresh route.
 * @param {import('express').Request} req
 */
export function extractRefreshToken(req) {
    const cookieToken = req.cookies?.refreshToken;
    if (cookieToken) {
        return { token: String(cookieToken), source: 'cookie' };
    }

    const header = req.headers?.authorization;
    if (header == null || header === '') {
        return { token: null, source: null };
    }
    if (typeof header !== 'string') {
        return { token: null, source: null, error: 'malformed_authorization' };
    }

    const trimmed = header.trim();
    const match = /^Bearer\s+(\S+)$/i.exec(trimmed);
    if (!match) {
        return { token: null, source: null, error: 'malformed_authorization' };
    }
    return { token: match[1], source: 'bearer' };
}
