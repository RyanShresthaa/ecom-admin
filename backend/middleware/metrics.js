/**
 * Record Prometheus HTTP metrics per request.
 */
import {
    httpRequestDuration,
    httpRequestsTotal,
    httpRequestsInFlight,
    routeLabel,
} from '../config/metrics.js';

export function metricsMiddleware(req, res, next) {
    // Skip scraping itself to avoid feedback loops
    if (req.path === '/metrics' || req.originalUrl?.startsWith('/metrics')) {
        return next();
    }

    httpRequestsInFlight.inc();
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        httpRequestsInFlight.dec();
        const route = routeLabel(req);
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };
        end(labels);
        httpRequestsTotal.inc(labels);
    });

    next();
}
