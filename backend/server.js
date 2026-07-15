/**
 * Shared API entry (Express 5).
 * Layout: backend/customer · backend/admin · backend/shared
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
import { apiLimiter, speedLimiter } from './shared/middleware/rateLimiter.js'
import { sanitizeInput } from './shared/middleware/sanitizeInput.js'
import { csrfProtection } from './shared/middleware/csrf.js'
import { securityRequestLogger } from './shared/middleware/securityLogger.js'
import { notFound, errorHandler } from './shared/middleware/errorHandler.js'
import { requestIdMiddleware } from './shared/middleware/requestId.js'
import { logger } from './shared/utils/logger.js'

import customerRoutes from './customer/index.js'
import adminRoutes from './admin/index.js'

dotenv.config()
validateEnv()

const app = express()

app.disable('x-powered-by')

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1))
}

app.use(requestIdMiddleware)
morgan.token('req-id', (req) => req.requestId || '-')
app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms :req-id'
      : ':method :url :status :response-time ms :req-id'
  )
)

app.use(helmet(getHelmetOptions()))
app.use(cors(getCorsOptions()))
app.use(hpp())
app.use(express.json({ limit: '1mb', strict: true }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())
app.use(sanitizeInput)
app.use(securityRequestLogger)
app.use(speedLimiter)
app.use('/api', apiLimiter)
app.use(csrfProtection)

setupSwagger(app)

app.get('/api/health', async (_req, res) => {
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
    database: db ? 'postgresql' : 'down',
    dbLatencyMs,
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

// Customer storefront + Admin/staff — same server, same DB
app.use('/api', customerRoutes)
app.use('/api', adminRoutes)

app.use(notFound)
setupExpressErrorHandler(app)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

async function start() {
  runProductionChecks()
  await initMonitoring()
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`)
  })
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message })
  process.exit(1)
})
