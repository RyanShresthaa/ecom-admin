/**
 * Runtime proxy: browser → /api/* → BACKEND_URL/api/*
 * Reads BACKEND_URL on each request (works after env changes without weird rewrite bake-in).
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function backendOrigin() {
  const raw = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')
  return raw
}

async function proxy(request, context) {
  const backend = backendOrigin()
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(backend)) {
    return Response.json(
      {
        message:
          'BACKEND_URL is not set to your Render API. Set BACKEND_URL=https://your-service.onrender.com and redeploy.',
        error: true,
        success: false,
      },
      { status: 502 },
    )
  }

  const params = await context.params
  const parts = params?.path || []
  const subPath = parts.join('/')
  const incoming = new URL(request.url)
  const target = `${backend}/api/${subPath}${incoming.search}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value)
  })

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  let upstream
  try {
    upstream = await fetch(target, init)
  } catch (err) {
    return Response.json(
      {
        message: `API unreachable at ${backend} (${err.message}). Is Render live? Free tier may be waking up.`,
        error: true,
        success: false,
      },
      { status: 502 },
    )
  }

  const outHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders.set(key, value)
  })

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
