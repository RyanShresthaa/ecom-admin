/**
 * On 429 responses, write a row to `security_events` (abuse signal).
 */
import { logSecurityEvent } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';

/** Log suspicious rate-limit / auth patterns at edge */
export function securityRequestLogger(req, res, next) {
    // Measure request duration for anomaly records.
    const start = Date.now();
    res.on('finish', () => {
        // Persist abuse signal whenever rate limiting blocks a request.
        if (res.statusCode === 429) {
            logSecurityEvent({
                userId: req.userId,
                action: 'abuse.rate_limited',
                ip: getClientIp(req),
                userAgent: getUserAgent(req),
                success: false,
                details: {
                    path: req.originalUrl,
                    method: req.method,
                    durationMs: Date.now() - start,
                },
            }).catch(() => {});
        }
    });
    next();
}
