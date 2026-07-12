import { createApp } from './app.js'

let app

export default function handler(req, res) {
  try {
    if (!app) app = createApp()
    return app(req, res)
  } catch (error) {
    console.error('API bootstrap failed:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
