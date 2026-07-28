/**
 * PostgreSQL: `feedback` — customer comments on product, seller, or business (optional user).
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

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
