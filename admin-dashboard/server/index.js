import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'

import { loadDb } from './db.js'
import apiRouter from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3000
const DIST_DIR = join(__dirname, '..', 'dist')
const serveFrontend = existsSync(join(DIST_DIR, 'index.html'))

loadDb()

const app = express()
app.use(express.json({ limit: '10mb' }))

app.use('/api', apiRouter)

if (serveFrontend) {
  app.use(express.static(DIST_DIR))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}/api`)
  if (serveFrontend) {
    console.log(`App serving at http://localhost:${PORT}`)
  } else {
    console.log('Run "npm run build" then "npm start" to serve the production app.')
  }
})
