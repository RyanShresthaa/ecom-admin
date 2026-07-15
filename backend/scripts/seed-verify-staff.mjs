import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcrypt'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const email = process.env.VERIFY_STAFF_EMAIL || 'staff.verify@matinacrafts.com'
const password = process.env.VERIFY_STAFF_PASSWORD || 'StaffVerify123!'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
})

const hash = await bcrypt.hash(password, 10)
const existing = await pool.query('select id from users where email=$1', [email])

if (existing.rows[0]) {
  await pool.query(
    `update users set role='Admin', password=$1, status='Active', verify_email=true where email=$2`,
    [hash, email]
  )
  console.log('Updated staff user', email)
} else {
  await pool.query(
    `insert into users (name, email, password, role, status, verify_email)
     values ($1,$2,$3,'Admin','Active',true)`,
    ['Verify Staff', email, hash]
  )
  console.log('Created staff user', email)
}

await pool.end()
console.log('Password:', password)
