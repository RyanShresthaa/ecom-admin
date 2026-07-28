/**
 * Log requests slower than SLOW_REQUEST_MS (default 1000).
 */
import { logger } from '../utils/logger.js';
import { getClientIp } from '../utils/requestMeta.js';

const thresholdMs = () => Number(process.env.SLOW_REQUEST_MS || 1000);

export function slowRequestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const limit = thresholdMs();
        if (!Number.isFinite(limit) || limit <= 0) return;
        if (durationMs < limit) return;

        logger.warn('Slow request', {
            type: 'slow_request',
            method: req.method,
            path: req.originalUrl?.split('?')[0],
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs),
            thresholdMs: limit,
            requestId: req.requestId,
            userId: req.userId ?? null,
            ip: getClientIp(req),
        });
    });
    next();
}
