/**
 * Single Vercel function that proxies ALL /api/* traffic to BACKEND_URL.
 * vercel.json rewrites /api/:path* → /api/proxy so nested paths always hit this file.
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

function resolveApiPath(req) {
  // Prefer rewrite query: /api/proxy?path=user/login
  const q = req.query?.path
  if (q != null && String(q).length) {
    const joined = Array.isArray(q) ? q.join('/') : String(q)
    return `/api/${joined.replace(/^\/+/, '')}`
  }

  // x-forwarded-uri / original url fallbacks
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || ''
  if (typeof forwarded === 'string' && forwarded.includes('/api')) {
    return forwarded.split('?')[0]
  }

  const incoming = new URL(req.url || '/', 'http://localhost')
  let path = incoming.pathname
  if (path.startsWith('/api/proxy')) path = '/api'
  if (!path.startsWith('/api')) path = `/api${path.startsWith('/') ? path : `/${path}`}`
  return path
}

async function readBody(req) {
  if (req.body != null && req.body !== '') {
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
          'Set BACKEND_URL in Vercel env to your Render URL (e.g. https://your-api.onrender.com), then redeploy.',
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
        message: 'BACKEND_URL cannot be localhost on Vercel.',
        error: true,
        success: false,
      })
    )
    return
  }

  try {
    const path = resolveApiPath(req)
    const incoming = new URL(req.url || '/', 'http://localhost')
    const target = `${origin}${path}${incoming.search}`

    const headers = { Accept: 'application/json' }
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
    if (req.headers.authorization) headers.Authorization = req.headers.authorization

    const method = req.method || 'GET'
    const init = { method, headers }
    const body = await readBody(req)
    if (body != null && method !== 'GET' && method !== 'HEAD') init.body = body

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
