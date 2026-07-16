import crypto from 'crypto';

const HEADER = 'x-request-id';

/**
 * Correlation ID for logs and error responses (no extra services).
 * Accepts client X-Request-Id or generates UUID; echoes on response.
 */
export function requestIdMiddleware(req, res, next) {
    // Reuse trusted inbound request id or generate a new correlation id.
    const incoming = req.headers[HEADER];
    const id =
        typeof incoming === 'string' && incoming.trim().length > 0 && incoming.length <= 128
            ? incoming.trim()
            : crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}
