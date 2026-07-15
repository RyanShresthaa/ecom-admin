/**
 * PostgreSQL: `addresses` — user delivery addresses.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

export async function createAddress(data) {
    const r = await pool.query(
        `INSERT INTO addresses (user_id, address_line, city, state, pincode, country, mobile)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            data.userId,
            data.address_line || '',
            data.city || '',
            data.state || '',
            data.pincode != null ? String(data.pincode) : null,
            data.country || '',
            data.mobile != null ? String(data.mobile) : null,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function findAddressesByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return mapRows(r.rows);
}

export async function updateAddress(id, userId, data) {
    const r = await pool.query(
        `UPDATE addresses SET
            address_line = COALESCE($1, address_line),
            city = COALESCE($2, city),
            state = COALESCE($3, state),
            pincode = COALESCE($4, pincode),
            country = COALESCE($5, country),
            mobile = COALESCE($6, mobile),
            updated_at = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [
            data.address_line,
            data.city,
            data.state,
            data.pincode != null ? String(data.pincode) : null,
            data.country,
            data.mobile != null ? String(data.mobile) : null,
            id,
            userId,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function deleteAddress(id, userId) {
    await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function findAddressById(id) {
    const r = await pool.query(`SELECT * FROM addresses WHERE id = $1`, [id]);
    return mapRow(r.rows[0]);
}

export async function findAddressByIdAndUser(id, userId) {
    const r = await pool.query(`SELECT * FROM addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
    return mapRow(r.rows[0]);
}
