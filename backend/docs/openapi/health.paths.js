/**
 * OpenAPI path definitions (tag: Health). Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Detailed health (DB readiness + process meta)
 *     description: Returns 200 when PostgreSQL responds; 503 when DB is down. Suitable for uptime monitors.
 *     responses:
 *       200:
 *         description: Healthy / ready
 *       503:
 *         description: Database unavailable
 *
 * /api/health/live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Always 200 if the process is running. Do not use for dependency checks (Kubernetes liveness).
 *     responses:
 *       200:
 *         description: Process alive
 *
 * /api/health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: 200 when PostgreSQL responds; 503 otherwise (Kubernetes readiness / load balancer).
 *     responses:
 *       200:
 *         description: Ready to serve traffic
 *       503:
 *         description: Not ready
 *
 * /metrics:
 *   get:
 *     tags: [Health]
 *     summary: Prometheus metrics
 *     description: Prometheus text exposition format. Protect with METRICS_BEARER_TOKEN in production.
 *     responses:
 *       200:
 *         description: Metrics payload
 *       401:
 *         description: Missing/invalid bearer token when METRICS_BEARER_TOKEN is set
 */

export {};
