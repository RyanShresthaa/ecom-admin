/**
 * Vercel serverless proxy → shared ecom backend.
 * Requires BACKEND_URL (or API_PROXY_TARGET) in Vercel env, e.g.
 *   BACKEND_URL=https://your-api.example.com
 * Never use localhost.
 */

function backendOrigin() {
  const raw = String(process.env.BACKEND_URL || process.env.API_PROXY_TARGET || '').replace(/\/$/, '')
  if (!raw) return ''
  return raw.replace(/\/api$/i, '')
}

function isLoopback(url) {
  try {
    const { hostname } = new URL(url.includes('://') ? url : `https://${url}`)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function apiPathFromReq(req) {
  const incoming = new URL(req.url || '/', 'http://localhost')
  let path = incoming.pathname
  // Catch-all sometimes receives /user/login without /api prefix
  if (!path.startsWith('/api')) {
    path = `/api${path.startsWith('/') ? path : `/${path}`}`
  }
  return { path, search: incoming.search }
}

async function readBody(req) {
  if (req.body != null) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return undefined
  return Buffer.concat(chunks).toString('utf8')
}

module.exports = async function handler(req, res) {
  const origin = backendOrigin()

  if (!origin) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        message:
          'API proxy not configured. In Vercel → Settings → Environment Variables, set BACKEND_URL to your deployed shared API origin (e.g. https://your-api.example.com), then redeploy.',
        error: true,
        success: false,
      })
    )
    return
  }

  if (isLoopback(origin)) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        message:
          'BACKEND_URL must not be localhost — a public Vercel site cannot reach your machine. Use your deployed API URL.',
        error: true,
        success: false,
      })
    )
    return
  }

  try {
    const { path, search } = apiPathFromReq(req)
    const target = `${origin}${path}${search}`
    const headers = { Accept: 'application/json' }
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
    if (req.headers.authorization) headers.Authorization = req.headers.authorization

    const method = req.method || 'GET'
    const init = { method, headers }
    const body = await readBody(req)
    if (body != null && method !== 'GET' && method !== 'HEAD') {
      init.body = body
    }

    const upstream = await fetch(target, init)
    const text = await upstream.text()
    res.statusCode = upstream.status
    const upstreamType = upstream.headers.get('content-type')
    if (upstreamType) res.setHeader('Content-Type', upstreamType)
    res.end(text)
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        message: error.message || 'Upstream API request failed',
        error: true,
        success: false,
      })
    )
  }
}
