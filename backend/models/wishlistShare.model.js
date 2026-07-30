/**
 * PostgreSQL: `wishlist_shares`
 */
import crypto from 'crypto';
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { findWishlistByUser } from './wishlist.model.js';
import { findUserPublicById } from './user.model.js';

export async function createOrRefreshWishlistShare(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    // Deactivate prior shares, then insert new active token
    await pool.query(
        `UPDATE wishlist_shares SET active = false, updated_at = NOW() WHERE user_id = $1 AND active = true`,
        [userId],
    );
    const r = await pool.query(
        `INSERT INTO wishlist_shares (user_id, token, active)
         VALUES ($1, $2, true)
         RETURNING *`,
        [userId, token],
    );
    return mapRow(r.rows[0]);
}

export async function findActiveWishlistShareByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM wishlist_shares WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
        [userId],
    );
    return mapRow(r.rows[0]);
}

export async function deactivateWishlistShares(userId) {
    await pool.query(
        `UPDATE wishlist_shares SET active = false, updated_at = NOW() WHERE user_id = $1 AND active = true`,
        [userId],
    );
}

export async function findWishlistShareByToken(token) {
    const r = await pool.query(
        `SELECT * FROM wishlist_shares WHERE token = $1 AND active = true LIMIT 1`,
        [String(token || '')],
    );
    return mapRow(r.rows[0]);
}

export async function getSharedWishlistPayload(token) {
    const share = await findWishlistShareByToken(token);
    if (!share) return null;
    const user = await findUserPublicById(share.user_id);
    if (!user || user.status !== 'Active') return null;
    const items = await findWishlistByUser(share.user_id);
    return {
        token: share.token,
        owner: {
            id: user.id,
            name: user.name,
            avatar: user.avatar || null,
        },
        items: items.map((row) => ({
            id: row.id,
            productId: row.product_id ?? row.productId,
            product: row.product,
            createdAt: row.createdAt,
        })),
        sharedAt: share.createdAt,
    };
}
