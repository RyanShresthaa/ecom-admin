import express from 'express'

import { ensureDb, isUsingPostgres } from './db.js'
import apiRouter from './routes.js'

// App factory: configures middleware, DB readiness guard, and API routes.
export function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  // Vercel rewrite: ensure non-/api calls are internally mapped to /api handlers.
  if (process.env.VERCEL) {
    app.use((req, _res, next) => {
      const path = req.url?.split('?')[0] || ''
      if (!path.startsWith('/api')) {
        req.url = `/api${path.startsWith('/') ? path : `/${path}`}${req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
      }
      next()
    })
  }

  // Startup guard: ensure storage is reachable before serving request handlers.
  app.use(async (_req, res, next) => {
    try {
      await ensureDb()
      next()
    } catch (error) {
      console.error('Database bootstrap failed:', error)
      res.status(500).json({
        message: error.message || 'Database unavailable',
        storage: isUsingPostgres() ? 'postgres' : 'file',
      })
    }
  })

  app.use('/api', apiRouter)

  // Final error boundary: converts uncaught handler errors to JSON response.
  app.use((err, _req, res, _next) => {
    console.error('API error:', err)
    res.status(500).json({ message: err.message || 'Internal server error' })
  })

  return app
}
