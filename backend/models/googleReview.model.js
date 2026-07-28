/**
 * Homepage Google / customer reviews — visibility controlled by admin.
 */
import pool from '../config/connectDB.js';
import { pickId } from '../utils/sql.js';

function mapRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        _id: row.id,
        sourceKey: row.source_key,
        name: row.author_name,
        role: row.role || '',
        text: row.body,
        rating: Number(row.rating),
        initials: row.initials || '',
        color: row.accent_color || '#8C523A',
        columnIndex: Number(row.column_index ?? 0),
        sortOrder: Number(row.sort_order ?? 0),
        isVisible: Boolean(row.is_visible),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/** Public: only reviews marked visible. */
export async function findVisibleGoogleReviews() {
    const r = await pool.query(
        `SELECT * FROM google_reviews
         WHERE is_visible = true
         ORDER BY column_index ASC, sort_order ASC, id ASC`,
    );
    return r.rows.map(mapRow);
}

/** Admin: all reviews. */
export async function findAllGoogleReviews() {
    const r = await pool.query(
        `SELECT * FROM google_reviews
         ORDER BY column_index ASC, sort_order ASC, id ASC`,
    );
    return r.rows.map(mapRow);
}

export async function setGoogleReviewVisibility(id, isVisible) {
    const r = await pool.query(
        `UPDATE google_reviews
         SET is_visible = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [pickId(id), Boolean(isVisible)],
    );
    return mapRow(r.rows[0]);
}

export async function setAllGoogleReviewsVisibility(isVisible) {
    await pool.query(
        `UPDATE google_reviews SET is_visible = $1, updated_at = NOW()`,
        [Boolean(isVisible)],
    );
    return findAllGoogleReviews();
}

/** Upsert a review synced from Google Places (keyed by source_key). */
export async function upsertGoogleReviewFromPlace(review, index = 0) {
    const author = String(review.author_name || review.authorName || 'Guest').trim() || 'Guest';
    const body = String(review.text || review.body || '').trim();
    if (!body) return null;
    const rating = Math.min(5, Math.max(1, Number(review.rating) || 5));
    const sourceKey = `google:${review.time || review.publishTime || index}:${author.slice(0, 40).toLowerCase().replace(/\s+/g, '-')}`;
    const initials = author
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
    const colors = ['#8C523A', '#A6674E', '#C2836B', '#BCA893', '#9E7D6F'];
    const accent = colors[index % colors.length];
    const columnIndex = index % 4;

    const r = await pool.query(
        `INSERT INTO google_reviews
            (source_key, author_name, role, body, rating, initials, accent_color, column_index, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (source_key) DO UPDATE SET
            author_name = EXCLUDED.author_name,
            body = EXCLUDED.body,
            rating = EXCLUDED.rating,
            initials = EXCLUDED.initials,
            updated_at = NOW()
         RETURNING *`,
        [
            sourceKey,
            author,
            'Google Review',
            body.slice(0, 2000),
            rating,
            initials || 'GR',
            accent,
            columnIndex,
            index,
        ],
    );
    return mapRow(r.rows[0]);
}
