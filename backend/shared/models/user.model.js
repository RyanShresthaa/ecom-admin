// user model: handles user table/entity CRUD and query helpers.
/**
 * PostgreSQL: `users` — lookup, public profile, updates, export/delete helpers.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

const PUBLIC_FIELDS = `id, name, email, mobile, avatar, verify_email, last_login_date, status, role, seller_request, created_at, updated_at,
    (pin_hash IS NOT NULL AND length(trim(pin_hash)) > 0) AS has_mobile_pin,
    COALESCE(mfa_enabled, false) AS mfa_enabled`;

// user model: findUserByEmail reads and returns records.
export async function findUserByEmail(email) {
    const r = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return mapRow(r.rows[0]);
}

// user model: findUserByMobile reads and returns records.
export async function findUserByMobile(mobile) {
    const r = await pool.query(`SELECT * FROM users WHERE mobile = $1`, [mobile]);
    return mapRow(r.rows[0]);
}

// user model: findUserByVerifyToken reads and returns records.
export async function findUserByVerifyToken(token) {
    const r = await pool.query(`SELECT * FROM users WHERE verify_email_token = $1`, [token]);
    return mapRow(r.rows[0]);
}

// user model: findUserByGoogleId reads and returns records.
export async function findUserByGoogleId(googleId) {
    const r = await pool.query(`SELECT * FROM users WHERE google_id = $1`, [googleId]);
    return mapRow(r.rows[0]);
}

// user model: createGoogleUser creates a new record.
export async function createGoogleUser({ name, email, google_id, avatar }) {
    const r = await pool.query(
        `INSERT INTO users (name, email, password, google_id, avatar, verify_email)
         VALUES ($1, $2, NULL, $3, $4, true)
         RETURNING ${PUBLIC_FIELDS}`,
        [name, email, google_id, avatar || ''],
    );
    return mapRow(r.rows[0]);
}

// user model: findUserById reads and returns records.
export async function findUserById(id) {
    const r = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return mapRow(r.rows[0]);
}

// user model: findUserAuthById reads and returns records.
export async function findUserAuthById(id) {
    const r = await pool.query(
        `SELECT id, refresh_token, status FROM users WHERE id = $1`,
        [id],
    );
    return r.rows[0] || null;
}

// user model: findUserPublicById reads and returns records.
export async function findUserPublicById(id) {
    const r = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
    return mapRow(r.rows[0]);
}

// user model: createUser creates a new record.
export async function createUser({ name, email, password }) {
    const r = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
         RETURNING ${PUBLIC_FIELDS}`,
        [name, email, password],
    );
    return mapRow(r.rows[0]);
}

// user model: countUsers reads and returns records.
export async function countUsers({ role } = {}) {
    if (role) {
        const r = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role = $1`, [role])
        return r.rows[0]?.c ?? 0
    }
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM users`)
    return r.rows[0]?.c ?? 0
}

// user model: findUsers reads and returns records.
export async function findUsers({ role, sellerRequest } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (role) {
        params.push(role);
        where += ` AND role = $${params.length}`;
    }
    if (sellerRequest === true) {
        where += ' AND seller_request = true';
    }
    const r = await pool.query(
        `SELECT ${PUBLIC_FIELDS} FROM users ${where} ORDER BY created_at DESC`,
        params,
    );
    return r.rows.map(mapRow);
}

// user model: deleteUserAccount deletes matching records.
export async function deleteUserAccount(id) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

// user model: exportUserData runs model logic/query operations.
export async function exportUserData(id) {
    const user = await findUserPublicById(id);
    const orders = await pool.query(`SELECT * FROM orders WHERE user_id = $1`, [id]);
    const addresses = await pool.query(`SELECT * FROM addresses WHERE user_id = $1`, [id]);
    const cart = await pool.query(`SELECT * FROM cart_items WHERE user_id = $1`, [id]);
    const wishlist = await pool.query(`SELECT * FROM wishlist_items WHERE user_id = $1`, [id]);
    return {
        user,
        orders: orders.rows,
        addresses: addresses.rows,
        cart: cart.rows,
        wishlist: wishlist.rows,
        exportedAt: new Date().toISOString(),
    };
}

// user model: updateUser updates existing records.
export async function updateUser(id, fields) {
    const allowed = [
        'name',
        'email',
        'mobile',
        'password',
        'avatar',
        'refresh_token',
        'verify_email',
        'verify_email_token',
        'last_login_date',
        'status',
        'forgot_password_otp',
        'forgot_password_expiry',
        'role',
        'google_id',
        'seller_request',
        'pin_hash',
        'pin_reset_otp',
        'pin_reset_expiry',
    ];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
        if (fields[key] !== undefined) {
            sets.push(`${key} = $${i++}`);
            values.push(fields[key]);
        }
    }
    if (!sets.length) return findUserById(id);
    values.push(id);
    const r = await pool.query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
        values,
    );
    return mapRow(r.rows[0]);
}

