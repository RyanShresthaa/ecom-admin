/**
 * Vercel serverless proxy → shared ecom backend.
 * Set BACKEND_URL in the Vercel project (e.g. https://your-api.example.com
 * or https://your-api.example.com/api). Never use localhost.
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
  if (!path.startsWith('/api')) {
    path = `/api${path.startsWith('/') ? path : `/${path}`}`
  }
  return { path, search: incoming.search }
}

export default async function handler(req, res) {
  const origin = backendOrigin()

  if (!origin) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        message:
          'API proxy not configured. Set BACKEND_URL in Vercel env to your deployed shared API (e.g. https://api.example.com), then redeploy.',
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
    if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
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
