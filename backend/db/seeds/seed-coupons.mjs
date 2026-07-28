/**
 * Seed default storefront coupons from coupons.sql.
 *
 * Usage (from backend/):
 *   npm run db:seed:coupons
 *   node db/seeds/seed-coupons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../../config/connectDB.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const sql = fs.readFileSync(path.join(__dirname, 'coupons.sql'), 'utf8');
await pool.query(sql);

const r = await pool.query(
    `SELECT code, discount_type, discount_value, min_order_amt, max_uses, active
     FROM coupons
     WHERE code IN ('MATINA', 'NEPAL', 'WELCOME')
     ORDER BY code`,
);
console.log(r.rows);
await pool.end();
