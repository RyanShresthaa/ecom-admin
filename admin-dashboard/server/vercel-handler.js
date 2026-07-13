import { createApp } from './app.js'
import { ensureDb, isUsingPostgres } from './db.js'

let app
let ready

async function getApp() {
  if (!ready) {
    ready = (async () => {
      await ensureDb()
      app = createApp()
      return app
    })().catch((error) => {
      ready = null
      throw error
    })
  }
  return ready
}

export default async function handler(req, res) {
  try {
    const application = await getApp()
    return application(req, res)
  } catch (error) {
    console.error('API bootstrap failed:', error)
    res.status(500).json({
      message: error.message || 'Internal server error',
      storage: isUsingPostgres() ? 'postgres' : 'file',
    })
  }
}
