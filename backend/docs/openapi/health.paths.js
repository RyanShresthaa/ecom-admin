/**
 * OpenAPI path definitions (tag: Health). Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness and database readiness
 *     description: Returns 200 when PostgreSQL responds; 503 when DB is down. Use for uptime monitors.
 *     responses:
 *       200:
 *         description: Healthy
 *       503:
 *         description: Database unavailable
 */

export {};
