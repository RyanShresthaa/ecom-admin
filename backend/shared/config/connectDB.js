/**
 * Shared PostgreSQL Pool (pg).
 * Supports Neon/Vercel style DATABASE_URL or classic DB_HOST / DB_NAME / …
 */
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

function buildPoolConfig() {
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL

  if (connectionString) {
    return {
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }
}

const pool = new Pool(buildPoolConfig())

pool.on('connect', () => {
  console.log('Connected to the database')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
  process.exit(1)
})

export default pool
