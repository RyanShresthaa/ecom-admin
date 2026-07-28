/**
 * PostgreSQL: `cart_items` — per-user cart lines.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { attachRelationsForRows } from './product.model.js';

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

/**
 * Atomic add-or-increment under UNIQUE (user_id, product_id) with row lock.
 * Prevents lost updates and overselling into cart under concurrency.
 */
export async function upsertCartItemQuantity({ userId, productId, quantity, maxStock }) {
    const addQty = Math.max(1, Number(quantity) || 1);
    const stock = Math.max(0, Number(maxStock) || 0);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const locked = await client.query(
            `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 FOR UPDATE`,
            [userId, productId],
        );
        const current = locked.rows[0] ? Number(locked.rows[0].quantity) : 0;
        const next = current + addQty;
        if (stock < 1 || next > stock) {
            await client.query('ROLLBACK');
            return {
                item: locked.rows[0] ? mapRow(locked.rows[0]) : null,
                stockExceeded: true,
            };
        }
        const r = await client.query(
            `INSERT INTO cart_items (user_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET quantity = $3, updated_at = NOW()
             RETURNING *`,
            [userId, productId, next],
        );
        await client.query('COMMIT');
        return { item: mapRow(r.rows[0]), stockExceeded: false };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
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
        `SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
                p.id AS p_id, p.name, p.image, p.category_id, p.subcategory_id, p.unit,
                p.stock, p.price, p.discount, p.description, p.more_details, p.publish,
                p.seller_id, p.low_stock_threshold, p.created_at AS p_created_at, p.updated_at AS p_updated_at
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1
         ORDER BY ci.created_at DESC`,
        [userId],
    );
    const productRows = r.rows
        .filter((row) => row.p_id != null)
        .map((row) => ({
            id: row.p_id,
            name: row.name,
            image: row.image,
            category_id: row.category_id,
            subcategory_id: row.subcategory_id,
            unit: row.unit,
            stock: row.stock,
            price: row.price,
            discount: row.discount,
            description: row.description,
            more_details: row.more_details,
            publish: row.publish,
            seller_id: row.seller_id,
            low_stock_threshold: row.low_stock_threshold,
            created_at: row.p_created_at,
            updated_at: row.p_updated_at,
        }));
    const products = await attachRelationsForRows(productRows);
    const byId = new Map(products.map((p) => [Number(p.id), p]));
    return r.rows.map((row) => ({
        id: row.id,
        _id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        quantity: row.quantity,
        created_at: row.created_at,
        updated_at: row.updated_at,
        productId: row.p_id != null ? byId.get(Number(row.p_id)) || null : null,
    }));
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
