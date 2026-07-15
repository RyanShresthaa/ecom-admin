import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')

if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(backendUrl)) {
  console.warn(
    '[next.config] BACKEND_URL is missing or points at localhost on Vercel. ' +
      'Set BACKEND_URL to your hosted API (e.g. https://your-api.up.railway.app) or /api calls will 404.',
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@phosphor-icons/react'],
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
