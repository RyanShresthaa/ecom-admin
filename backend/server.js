/**
 * Shared API entry (Express 5).
 * Layout: backend/customer · backend/admin · backend/shared
 * Phase 5: optional Redis, /api/ready, /api/v1 alias of /api.
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import hpp from 'hpp'
import os from 'os'
import morgan from 'morgan'

import pool from './shared/config/connectDB.js'
import { validateEnv } from './shared/config/validateEnv.js'
import { getCorsOptions, getHelmetOptions } from './shared/config/security.js'
import { setupSwagger } from './shared/config/swagger.js'
import { initMonitoring, setupExpressErrorHandler } from './shared/config/monitoring.js'
import { runProductionChecks } from './shared/config/production.js'
import { initRedis, getRedisStatus, redisPing } from './shared/config/redis.js'
import { apiLimiter, speedLimiter } from './shared/middleware/rateLimiter.js'
import { sanitizeInput } from './shared/middleware/sanitizeInput.js'
import { csrfProtection } from './shared/middleware/csrf.js'
import { securityRequestLogger } from './shared/middleware/securityLogger.js'
import { notFound, errorHandler } from './shared/middleware/errorHandler.js'
import { requestIdMiddleware } from './shared/middleware/requestId.js'
import { logger } from './shared/utils/logger.js'

import customerRoutes from './customer/index.js'
import adminRoutes from './admin/index.js'
import auth from './shared/middleware/auth.js'
import { staff } from './shared/middleware/roles.js'
import { paymentWebhookController } from './customer/controllers/paymentWebhook.controller.js'

dotenv.config()
validateEnv()

const app = express()
const API_VERSION = 'v1'

// Disable framework fingerprint header on all API responses.
app.disable('x-powered-by')

// Trust reverse proxy headers only in production deployments.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1))
}

// Attach per-request id and structured HTTP request logging.
app.use(requestIdMiddleware)
morgan.token('req-id', (req) => req.requestId || '-')
app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms :req-id'
      : ':method :url :status :response-time ms :req-id'
  )
)

// Apply cross-origin, security, payload, and request sanitization middleware stack.
app.use(helmet(getHelmetOptions()))
app.use(cors(getCorsOptions()))
app.use(hpp())

// Payment webhooks need raw body for signature verification (before JSON parser).
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentWebhookController)
app.post(`/api/${API_VERSION}/payment/webhook`, express.raw({ type: 'application/json' }), paymentWebhookController)

app.use(express.json({ limit: '1mb', strict: true }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())
app.use(sanitizeInput)
app.use(securityRequestLogger)
app.use(speedLimiter)

/** Mount the same API under /api and /api/v1 */
function mountApi(basePath) {
  // Apply API rate limiting to each mounted API root.
  app.use(basePath, apiLimiter)

  // Expose health route for liveness and dependency telemetry.
  app.get(`${basePath}/health`, async (_req, res) => {
    const started = Date.now()
    let db = false
    let dbLatencyMs = null
    try {
      const t0 = Date.now()
      await pool.query('SELECT 1')
      db = true
      dbLatencyMs = Date.now() - t0
    } catch {
      /* db stays false */
    }
    const mem = process.memoryUsage()
    const ready = db
    res.status(ready ? 200 : 503).json({
      ok: ready,
      status: ready ? 'ready' : 'not_ready',
      apiVersion: API_VERSION,
      database: db ? 'postgresql' : 'down',
      dbLatencyMs,
      redis: getRedisStatus(),
      uptimeSec: Math.floor(process.uptime()),
      responseMs: Date.now() - started,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
      host: os.hostname(),
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    })
  })

  /** Readiness: DB required; Redis optional (reported but not required unless REDIS_REQUIRED=true) */
  app.get(`${basePath}/ready`, async (_req, res) => {
    let db = false
    try {
      await pool.query('SELECT 1')
      db = true
    } catch {
      /* db stays false */
    }

    const redisStatus = getRedisStatus()
    let redisOk = true
    if (redisStatus !== 'disabled') {
      redisOk = await redisPing()
    }
    const requireRedis = process.env.REDIS_REQUIRED === 'true'
    const ready = db && (!requireRedis || redisOk)

    res.status(ready ? 200 : 503).json({
      ok: ready,
      status: ready ? 'ready' : 'not_ready',
      checks: {
        database: db ? 'up' : 'down',
        redis: redisStatus === 'disabled' ? 'skipped' : redisOk ? 'up' : 'down',
      },
      apiVersion: API_VERSION,
    })
  })

  // Mount customer and admin feature routers under the API prefix.
  app.use(basePath, customerRoutes)
  app.use(basePath, adminRoutes)
}

// Register CSRF guard and OpenAPI docs before route mounting.
app.use(csrfProtection)
setupSwagger(app)

// Publish both unversioned and versioned API route roots.
mountApi('/api')
mountApi(`/api/${API_VERSION}`)

// Register fallback 404 and centralized error handlers.
app.use(notFound)
setupExpressErrorHandler(app)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

// Start boot sequence: production checks, Redis/monitoring init, then HTTP listener.
async function start() {
  runProductionChecks()
  await initRedis()
  await initMonitoring()

  const { logQueueStatus } = await import('./shared/queue/index.js')
  await logQueueStatus()

  const { createBullBoardRouter } = await import('./shared/queue/bullBoard.js')
  const boardRouter = await createBullBoardRouter('/api/admin/queues')
  if (boardRouter) {
    app.use('/api/admin/queues', auth, staff, boardRouter)
    logger.info('Bull Board: /api/admin/queues (staff only)')
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`API: /api and /api/${API_VERSION}`)
    logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`)
  })
}

// Exit process when startup initialization fails.
start().catch((err) => {
  logger.error('Failed to start server', { error: err.message })
  process.exit(1)
})
