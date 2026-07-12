import express from 'express'

import { loadDb } from './db.js'
import apiRouter from './routes.js'

export function createApp() {
  loadDb()

  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api', apiRouter)

  return app
}
