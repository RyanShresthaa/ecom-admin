/**
 * PostgreSQL: `cart_items` — per-user cart lines.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { findProductById } from './product.model.js';

export async function findCartItem(userId, productId) {
    const r = await pool.query(
        `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
    );
    return mapRow(r.rows[0]);
}

export async function createCartItem({ userId, productId, quantity }) {
    const r = await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *`,
        [userId, productId, quantity],
    );
    return mapRow(r.rows[0]);
}

export async function updateCartItemQuantity(id, quantity) {
    const r = await pool.query(
        `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [quantity, id],
    );
    return mapRow(r.rows[0]);
}

export async function findCartByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM cart_items WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    const items = await Promise.all(
        r.rows.map(async (row) => {
            const item = mapRow(row);
            item.productId = await findProductById(row.product_id);
            return item;
        }),
    );
    return items;
}

export async function findCartItemById(id) {
    const r = await pool.query(`SELECT * FROM cart_items WHERE id = $1`, [id]);
    return mapRow(r.rows[0]);
}

export async function deleteCartItem(id, userId) {
    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function clearCart(userId) {
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
}
