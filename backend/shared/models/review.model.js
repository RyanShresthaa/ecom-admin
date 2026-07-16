// review model: handles review table/entity CRUD and query helpers.
/**
 * PostgreSQL: `reviews` — per user/product; unique (user_id, product_id).
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

// review model: createReview creates a new record.
export async function createReview({ userId, productId, rating, comment }) {
    const r = await pool.query(
        `INSERT INTO reviews (user_id, product_id, rating, comment)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, productId, rating, comment || ''],
    );
    return mapRow(r.rows[0]);
}

// review model: findReviewsByProduct reads and returns records.
export async function findReviewsByProduct(productId) {
    const r = await pool.query(
        `SELECT r.*, u.name AS user_name FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
        [productId],
    );
    return r.rows.map((row) => ({
        ...mapRow(row),
        userName: row.user_name,
    }));
}

// review model: getProductRatingSummary reads and returns records.
export async function getProductRatingSummary(productId) {
    const r = await pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS avg
         FROM reviews WHERE product_id = $1`,
        [productId],
    );
    return r.rows[0];
}

// review model: deleteReview deletes matching records.
export async function deleteReview(id, userId) {
    const r = await pool.query(
        `DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId],
    );
    return r.rowCount > 0;
}

