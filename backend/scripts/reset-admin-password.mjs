/**
 * Reset local admin password to match admin-dashboard demo credentials.
 * Usage: node scripts/reset-admin-password.mjs
 */
import pool from '../config/connectDB.js';
import { hashPassword } from '../utils/passwordHash.js';

const email = process.env.ADMIN_EMAIL || 'ryanshr03@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@1234';

const hash = await hashPassword(password);
let r = await pool.query(
  `UPDATE users
   SET password = $1, status = 'Active', verify_email = true, role = 'Admin', updated_at = NOW()
   WHERE email = $2
   RETURNING id, email, role`,
  [hash, email],
);

if (!r.rows[0]) {
  // Fresh databases may not have an admin yet. Create one idempotently.
  const created = await pool.query(
    `INSERT INTO users (name, email, password, role, status, verify_email, created_at, updated_at)
     VALUES ($1, $2, $3, 'Admin', 'Active', true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'Admin',
           status = 'Active',
           verify_email = true,
           updated_at = NOW()
     RETURNING id, email, role`,
    ['Admin', email, hash],
  );
  r = created;
  console.log(`Created admin user for ${email}`);
}

console.log(`Updated ${r.rows[0].email} (id=${r.rows[0].id}, role=${r.rows[0].role})`);
console.log(`Password set to: ${password}`);
await pool.end();
