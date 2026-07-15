/**
 * Client IP (X-Forwarded-For aware) and truncated User-Agent for security / audit logs.
 */
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
}

export function getUserAgent(req) {
    return String(req.headers['user-agent'] || '').slice(0, 512);
}
