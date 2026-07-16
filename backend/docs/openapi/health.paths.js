/**
 * OpenAPI path definitions (tag: Health). Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness and database readiness
 *     description: |
 *       Returns 200 when PostgreSQL responds; 503 when DB is down.
 *       Also reports Redis status (optional). Same route exists at `/api/v1/health`.
 *     responses:
 *       200:
 *         description: Healthy
 *       503:
 *         description: Database unavailable
 * /api/ready:
 *   get:
 *     tags: [Health]
 *     summary: Kubernetes-style readiness probe
 *     description: |
 *       Requires PostgreSQL. Redis is reported but only required when `REDIS_REQUIRED=true`.
 *       Same route exists at `/api/v1/ready`.
 *     responses:
 *       200:
 *         description: Ready to receive traffic
 *       503:
 *         description: Not ready (DB down, or Redis down when required)
 */

export {};
