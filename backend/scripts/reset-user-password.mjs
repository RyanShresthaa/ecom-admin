/**
 * One-off admin password reset. Usage:
 *   node scripts/reset-user-password.mjs <email> <newPassword>
 */
import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validatePasswordStrength } from '../shared/utils/password.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-user-password.mjs <email> <newPassword>')
  process.exit(1)
}

const pwdErr = validatePasswordStrength(newPassword)
if (pwdErr) {
  console.error(pwdErr)
  process.exit(1)
}

const hash = await bcrypt.hash(newPassword, 10)
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const { rows, rowCount } = await pool.query(
  `UPDATE users
   SET password = $1,
       failed_login_attempts = 0,
       locked_until = NULL,
       forgot_password_otp = NULL,
       forgot_password_expiry = NULL
   WHERE email = $2
   RETURNING id, name, email, role`,
  [hash, email],
)

await pool.end()

if (!rowCount) {
  console.error(`No user found with email: ${email}`)
  process.exit(1)
}

console.log('Password reset for:', rows[0])
