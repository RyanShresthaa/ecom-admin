/**
 * PostgreSQL: `wishlist_items`.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { findProductById } from './product.model.js';

export async function addWishlist(userId, productId) {
    const r = await pool.query(
        `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO UPDATE SET created_at = NOW()
         RETURNING *`,
        [userId, productId],
    );
    return mapRow(r.rows[0]);
}

export async function removeWishlist(userId, productId) {
    await pool.query(`DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
}

export async function findWishlistByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return Promise.all(
        r.rows.map(async (row) => ({
            ...mapRow(row),
            product: await findProductById(row.product_id),
        })),
    );
}
