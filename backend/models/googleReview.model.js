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

function initialsFromName(name) {
    return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('') || 'GR';
}

/** Admin: create a homepage testimonial / review row. */
export async function createGoogleReview({
    name,
    role = '',
    text,
    rating = 5,
    initials,
    color = '#8C523A',
    columnIndex = 0,
    sortOrder = 0,
    isVisible = true,
    sourceKey,
}) {
    const author = String(name || '').trim();
    const body = String(text || '').trim();
    if (!author || !body) return null;
    const key =
        String(sourceKey || '').trim() ||
        `manual:${Date.now()}:${author.slice(0, 40).toLowerCase().replace(/\s+/g, '-')}`;
    const r = await pool.query(
        `INSERT INTO google_reviews
            (source_key, author_name, role, body, rating, initials, accent_color, column_index, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            key,
            author,
            String(role || '').slice(0, 120),
            body.slice(0, 2000),
            Math.min(5, Math.max(1, Number(rating) || 5)),
            String(initials || initialsFromName(author)).slice(0, 4),
            String(color || '#8C523A').slice(0, 32),
            Math.min(3, Math.max(0, Number(columnIndex) || 0)),
            Math.max(0, Number(sortOrder) || 0),
            Boolean(isVisible),
        ],
    );
    return mapRow(r.rows[0]);
}

/** Admin: update review fields (content + layout + visibility). */
export async function updateGoogleReview(id, fields = {}) {
    const current = await pool.query(`SELECT * FROM google_reviews WHERE id = $1`, [pickId(id)]);
    if (!current.rows[0]) return null;
    const cur = current.rows[0];
    const author =
        fields.name !== undefined ? String(fields.name || '').trim() : cur.author_name;
    const body = fields.text !== undefined ? String(fields.text || '').trim() : cur.body;
    if (!author || !body) return null;
    const r = await pool.query(
        `UPDATE google_reviews SET
            author_name = $2,
            role = $3,
            body = $4,
            rating = $5,
            initials = $6,
            accent_color = $7,
            column_index = $8,
            sort_order = $9,
            is_visible = $10,
            updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
            pickId(id),
            author,
            fields.role !== undefined ? String(fields.role || '').slice(0, 120) : cur.role,
            body.slice(0, 2000),
            fields.rating !== undefined
                ? Math.min(5, Math.max(1, Number(fields.rating) || 5))
                : cur.rating,
            fields.initials !== undefined
                ? String(fields.initials || initialsFromName(author)).slice(0, 4)
                : cur.initials,
            fields.color !== undefined
                ? String(fields.color || '#8C523A').slice(0, 32)
                : cur.accent_color,
            fields.columnIndex !== undefined
                ? Math.min(3, Math.max(0, Number(fields.columnIndex) || 0))
                : cur.column_index,
            fields.sortOrder !== undefined
                ? Math.max(0, Number(fields.sortOrder) || 0)
                : cur.sort_order,
            fields.isVisible !== undefined ? Boolean(fields.isVisible) : cur.is_visible,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function deleteGoogleReview(id) {
    const r = await pool.query(`DELETE FROM google_reviews WHERE id = $1 RETURNING id`, [
        pickId(id),
    ]);
    return Boolean(r.rows[0]);
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
