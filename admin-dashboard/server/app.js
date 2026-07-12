import express from 'express'

import { loadDb } from './db.js'
import apiRouter from './routes.js'

export function createApp() {
  loadDb()

  const app = express()
  app.use(express.json({ limit: '10mb' }))

  if (process.env.VERCEL) {
    // Vercel may forward /api/* with or without the /api prefix depending on routing.
    app.use((req, _res, next) => {
      const path = req.url?.split('?')[0] || ''
      if (!path.startsWith('/api')) {
        req.url = `/api${path.startsWith('/') ? path : `/${path}`}${req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
      }
      next()
    })
  }

  app.use('/api', apiRouter)

  app.use((err, _req, res, _next) => {
    console.error('API error:', err)
    res.status(500).json({ message: err.message || 'Internal server error' })
  })

  return app
}
