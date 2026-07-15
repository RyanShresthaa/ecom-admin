import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@phosphor-icons/react'],
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:5000'
    return [
      {
        source: '/api/:path*',
        destination: `${backend.replace(/\/$/, '')}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
