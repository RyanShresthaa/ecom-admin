import express from 'express'

import { loadDb } from './db.js'
import apiRouter from './routes.js'

export function createApp() {
  loadDb()

  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api', apiRouter)

  // Vercel serverless rewrites can strip the /api prefix before the handler runs.
  if (process.env.VERCEL) {
    app.use('/', apiRouter)
  }

  app.use((err, _req, res, _next) => {
    console.error('API error:', err)
    res.status(500).json({ message: err.message || 'Internal server error' })
  })

  return app
}
