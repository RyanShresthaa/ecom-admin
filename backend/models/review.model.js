/**
 * PostgreSQL: `reviews` — per user/product; unique (user_id, product_id).
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

export async function createReview({ userId, productId, rating, comment }) {
    const r = await pool.query(
        `INSERT INTO reviews (user_id, product_id, rating, comment)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, productId, rating, comment || ''],
    );
    return mapRow(r.rows[0]);
}

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

export async function getProductRatingSummary(productId) {
    const r = await pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS avg
         FROM reviews WHERE product_id = $1`,
        [productId],
    );
    return r.rows[0];
}

export async function findReviewsByUser(userId, { limit = 50 } = {}) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const r = await pool.query(
        `SELECT r.*, p.name AS product_name, p.id AS product_id
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2`,
        [userId, safeLimit],
    );
    return r.rows.map((row) => ({
        ...mapRow(row),
        productName: row.product_name,
        productId: row.product_id,
    }));
}

/** Delete own review by id. Returns true if a row was removed. */
export async function deleteReview(reviewId, userId) {
    if (!reviewId || !userId) return false;
    const r = await pool.query(
        `DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id`,
        [reviewId, userId],
    );
    return Boolean(r.rows[0]);
}
