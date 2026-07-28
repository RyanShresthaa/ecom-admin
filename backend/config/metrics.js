/**
 * Prometheus metrics (prom-client): HTTP, auth, bcrypt, DB probes, business KPIs.
 * Scraped at GET /metrics — secured via METRICS_BEARER_TOKEN (+ optional IP allowlist).
 */
import client from 'prom-client';
import { getClientIp } from '../utils/requestMeta.js';

const PREFIX = process.env.METRICS_PREFIX || 'app_';

export const register = new client.Registry();
client.collectDefaultMetrics({
    register,
    prefix: PREFIX,
    labels: {
        service: process.env.SERVICE_NAME || 'ecommerce-api',
        env: process.env.NODE_ENV || 'development',
    },
});

export const httpRequestDuration = new client.Histogram({
    name: `${PREFIX}http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [register],
});

export const httpRequestsTotal = new client.Counter({
    name: `${PREFIX}http_requests_total`,
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

export const httpRequestsInFlight = new client.Gauge({
    name: `${PREFIX}http_requests_in_flight`,
    help: 'HTTP requests currently being processed',
    registers: [register],
});

export const authLoginAttempts = new client.Counter({
    name: `${PREFIX}auth_login_attempts_total`,
    help: 'Login attempts by outcome',
    labelNames: ['outcome'],
    registers: [register],
});

export const authPasswordRehashes = new client.Counter({
    name: `${PREFIX}auth_password_rehashes_total`,
    help: 'Passwords rehashed after login due to bcrypt cost upgrade',
    labelNames: ['from_cost'],
    registers: [register],
});

export const bcryptHashDuration = new client.Histogram({
    name: `${PREFIX}bcrypt_hash_duration_seconds`,
    help: 'bcrypt.hash duration in seconds',
    labelNames: ['cost'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
    registers: [register],
});

export const bcryptCompareDuration = new client.Histogram({
    name: `${PREFIX}bcrypt_compare_duration_seconds`,
    help: 'bcrypt.compare duration in seconds',
    labelNames: ['cost'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
    registers: [register],
});

export const authLoginDuration = new client.Histogram({
    name: `${PREFIX}auth_login_duration_seconds`,
    help: 'End-to-end password login handler latency',
    labelNames: ['outcome'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [register],
});

export const authRefreshDuration = new client.Histogram({
    name: `${PREFIX}auth_refresh_duration_seconds`,
    help: 'End-to-end refresh-token handler latency',
    labelNames: ['outcome'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [register],
});

export const dbQueryDuration = new client.Histogram({
    name: `${PREFIX}db_query_duration_seconds`,
    help: 'Database probe / query duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [register],
});

/** Business / product KPIs */
export const businessOrders = new client.Counter({
    name: `${PREFIX}business_orders_total`,
    help: 'Orders created or failed',
    labelNames: ['outcome', 'channel'],
    registers: [register],
});

export const businessPayments = new client.Counter({
    name: `${PREFIX}business_payments_total`,
    help: 'Payment attempts by outcome',
    labelNames: ['outcome', 'provider'],
    registers: [register],
});

export const businessCheckout = new client.Counter({
    name: `${PREFIX}business_checkout_total`,
    help: 'Checkout funnel events',
    labelNames: ['step'],
    registers: [register],
});

export const businessUsers = new client.Counter({
    name: `${PREFIX}business_users_total`,
    help: 'User lifecycle events',
    labelNames: ['event'],
    registers: [register],
});

export const businessUploads = new client.Counter({
    name: `${PREFIX}business_uploads_total`,
    help: 'File uploads by outcome',
    labelNames: ['outcome'],
    registers: [register],
});

export const businessNewsletter = new client.Counter({
    name: `${PREFIX}business_newsletter_subscriptions_total`,
    help: 'Newsletter subscription attempts',
    labelNames: ['outcome'],
    registers: [register],
});

export const businessCartAbandonments = new client.Counter({
    name: `${PREFIX}business_cart_abandonments_total`,
    help: 'Explicit cart/checkout abandonment events from clients',
    labelNames: ['reason'],
    registers: [register],
});

export const metricsAuthDenied = new client.Counter({
    name: `${PREFIX}metrics_scrape_denied_total`,
    help: 'Denied /metrics scrapes',
    labelNames: ['reason'],
    registers: [register],
});

/** Normalize Express path for low-cardinality labels */
export function routeLabel(req) {
    const base = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.originalUrl?.split('?')[0] || 'unknown';
    return base.replace(/\/\d+/g, '/:id').slice(0, 120);
}

function parseAllowlist() {
    const raw = process.env.METRICS_ALLOWLIST_IPS || process.env.METRICS_ALLOWED_IPS || '';
    return String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Exact IP or simple prefix (e.g. 10.0.0.) — keep ops simple without a CIDR library */
function ipAllowed(ip, allowlist) {
    if (!allowlist.length) return true;
    const normalized = String(ip || '').replace(/^::ffff:/, '');
    return allowlist.some((entry) => {
        if (entry.endsWith('.')) return normalized.startsWith(entry);
        if (entry.includes('/')) {
            // Basic IPv4 CIDR (/8,/16,/24,/32)
            const [base, bitsStr] = entry.split('/');
            const bits = Number(bitsStr);
            if (!Number.isInteger(bits) || bits < 0 || bits > 32) return normalized === entry;
            const toInt = (a) =>
                a.split('.').reduce((acc, o) => (acc << 8) + (Number(o) & 255), 0) >>> 0;
            try {
                const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
                return (toInt(normalized) & mask) === (toInt(base) & mask);
            } catch {
                return false;
            }
        }
        return normalized === entry || ip === entry;
    });
}

function isPrivateIp(ip) {
    const n = String(ip || '').replace(/^::ffff:/, '');
    if (n === '127.0.0.1' || n === '::1' || n === 'localhost') return true;
    if (n.startsWith('10.')) return true;
    if (n.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(n)) return true;
    return false;
}

/**
 * Secure /metrics handler.
 * Production: METRICS_BEARER_TOKEN required unless METRICS_ALLOW_INSECURE=true (escape hatch).
 * Optional METRICS_ALLOWLIST_IPS; optional METRICS_REQUIRE_PRIVATE_IP=true.
 */
export async function metricsHandler(req, res) {
    const production = process.env.NODE_ENV === 'production';
    const token = process.env.METRICS_BEARER_TOKEN?.trim();
    const allowInsecure = process.env.METRICS_ALLOW_INSECURE === 'true';
    const requirePrivate = process.env.METRICS_REQUIRE_PRIVATE_IP === 'true';
    const allowlist = parseAllowlist();
    const clientIp = getClientIp(req);

    if (production && !token && !allowInsecure) {
        metricsAuthDenied.inc({ reason: 'token_required' });
        return res.status(403).json({
            message: 'Metrics disabled: set METRICS_BEARER_TOKEN (or METRICS_ALLOW_INSECURE=true)',
            error: true,
            success: false,
        });
    }

    if (token) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${token}`) {
            metricsAuthDenied.inc({ reason: 'bad_token' });
            return res.status(401).json({ message: 'Unauthorized', error: true, success: false });
        }
    }

    if (allowlist.length && !ipAllowed(clientIp, allowlist)) {
        metricsAuthDenied.inc({ reason: 'ip_deny' });
        return res.status(403).json({ message: 'Forbidden', error: true, success: false });
    }

    if (requirePrivate && !isPrivateIp(clientIp)) {
        metricsAuthDenied.inc({ reason: 'public_ip' });
        return res.status(403).json({ message: 'Forbidden', error: true, success: false });
    }

    res.setHeader('Content-Type', register.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.end(await register.metrics());
}
