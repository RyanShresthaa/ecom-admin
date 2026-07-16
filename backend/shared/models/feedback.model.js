// feedback model: handles feedback table/entity CRUD and query helpers.
/**
 * PostgreSQL: `feedback` — customer comments on product, seller, or business (optional user).
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

// feedback model: insertFeedback creates a new record.
export async function insertFeedback({
    userId,
    targetType,
    productId,
    sellerId,
    rating,
    title,
    comment,
}) {
    const r = await pool.query(
        `INSERT INTO feedback (user_id, target_type, product_id, seller_id, rating, title, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, target_type, product_id, seller_id, rating, title, comment, created_at`,
        [
            userId ?? null,
            targetType,
            productId ?? null,
            sellerId ?? null,
            rating ?? null,
            String(title || '').slice(0, 200),
            String(comment || '').slice(0, 8000),
        ],
    );
    return mapRow(r.rows[0]);
}

// feedback model: listFeedback reads and returns records.
export async function listFeedback({ limit = 50, skip = 0, targetType } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (targetType) {
        params.push(targetType);
        where += ` AND target_type = $${params.length}`;
    }
    const limIdx = params.length + 1;
    const offIdx = params.length + 2;
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT f.*, u.name AS user_name, u.email AS user_email
         FROM feedback f
         LEFT JOIN users u ON u.id = f.user_id
         ${where}
         ORDER BY f.created_at DESC
         LIMIT $${limIdx} OFFSET $${offIdx}`,
        params,
    );
    return mapRows(r.rows);
}

/** Count feedback rows per product (admin products table complaints column). */
// feedback model: countFeedbackByProductIds aggregates complaint counts.
export async function countFeedbackByProductIds(productIds = []) {
    const ids = [...new Set(productIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!ids.length) return new Map();

    const r = await pool.query(
        `SELECT product_id, COUNT(*)::int AS c
         FROM feedback
         WHERE product_id = ANY($1::int[])
           AND (target_type = 'product' OR target_type IS NULL OR target_type = '')
         GROUP BY product_id`,
        [ids],
    );

    const map = new Map();
    for (const row of r.rows) {
        map.set(String(row.product_id), Number(row.c || 0));
    }
    return map;
}

