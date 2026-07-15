/**
 * Strip `$`-prefixed / prototype keys from `body` and `query` (defense in depth).
 * SQL still uses parameterized queries — this blocks prototype pollution / operator abuse.
 */
const BLOCKED_KEYS = /^\$|__proto__|constructor|prototype/i;

function scrub(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(scrub);
    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (BLOCKED_KEYS.test(key)) continue;
        out[key] = scrub(val);
    }
    return out;
}

function scrubInPlace(value) {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach(scrubInPlace);
        return;
    }
    for (const key of Object.keys(value)) {
        if (BLOCKED_KEYS.test(key)) {
            delete value[key];
            continue;
        }
        scrubInPlace(value[key]);
    }
}

export function sanitizeInput(req, _res, next) {
    if (req.body && typeof req.body === 'object') req.body = scrub(req.body);
    scrubInPlace(req.query);
    scrubInPlace(req.params);
    next();
}
