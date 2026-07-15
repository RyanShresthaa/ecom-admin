import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

function poolConfig() {
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
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }
}

const pool = new pg.Pool(poolConfig())

const dir = path.join(__dirname, '..', 'db', 'migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

for (const file of files) {
  console.log(`Running ${file}...`)
  await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'))
}

await pool.end()
console.log('Migrations done.')
