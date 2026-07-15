import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@phosphor-icons/react'],
  outputFileTracingRoot: path.join(__dirname),
  // /api/* is handled at runtime by app/api/[...path]/route.js (reads BACKEND_URL per request).
  // Local: set BACKEND_URL=http://localhost:5000 (or rely on default in the route).
}

export default nextConfig
