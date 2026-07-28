/**
 * Reset local admin password to match admin-dashboard demo credentials.
 * Usage: node scripts/reset-admin-password.mjs
 */
import pool from '../config/connectDB.js';
import { hashPassword } from '../utils/passwordHash.js';

const email = process.env.ADMIN_EMAIL || 'ryanshr03@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@1234';

const hash = await hashPassword(password);
const r = await pool.query(
  `UPDATE users
   SET password = $1, status = 'Active', verify_email = true, role = 'Admin', updated_at = NOW()
   WHERE email = $2
   RETURNING id, email, role`,
  [hash, email],
);

if (!r.rows[0]) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

console.log(`Updated ${r.rows[0].email} (id=${r.rows[0].id}, role=${r.rows[0].role})`);
console.log(`Password set to: ${password}`);
await pool.end();
