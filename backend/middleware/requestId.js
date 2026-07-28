import crypto from 'crypto';

const HEADER = 'x-request-id';

/**
 * Correlation ID for logs and error responses (no extra services).
 * Accepts client X-Request-Id or generates UUID; echoes on response.
 */
export function requestIdMiddleware(req, res, next) {
    const incoming = req.headers[HEADER];
    const id =
        typeof incoming === 'string' && incoming.trim().length > 0 && incoming.length <= 128
            ? incoming.trim()
            : crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}
