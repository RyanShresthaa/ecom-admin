// cartproduct model: handles cartproduct table/entity CRUD and query helpers.
/**
 * PostgreSQL: `cart_items` — user OR guest cart lines (Phase 4).
 * Owner is exactly one of user_id / guest_id. Guest rows have expires_at.
 */
import pool from '../config/connectDB.js';
import { mapRow, pickId } from '../utils/sql.js';
import { findProductById } from './product.model.js';
import { findVariantById } from './variant.model.js';
import { guestExpiresAt } from '../middleware/guestCart.js';

// cartproduct model: mapCartItem reads and returns records.
function mapCartItem(row) {
    if (!row) return null;
    const item = mapRow(row);
    item.variantId = row.variant_id || null;
    item.guestId = row.guest_id || null;
    item.expiresAt = row.expires_at || null;
    return item;
}

// cartproduct model: ownerClause runs model logic/query operations.
function ownerClause(owner, paramIndex) {
    if (owner?.userId) {
        return { sql: `user_id = $${paramIndex}`, value: owner.userId };
    }
    return { sql: `guest_id = $${paramIndex}`, value: owner.guestId };
}

/** Find cart line for product (+ optional variant) under owner. */
// cartproduct model: findCartItem reads and returns records.
export async function findCartItem(owner, productId, variantId = null) {
    // Backward compat: findCartItem(userId, productId, variantId)
    if (typeof owner === 'number' || (typeof owner === 'string' && !owner.userId && !owner.guestId)) {
        owner = { userId: owner, guestId: null };
    }
    const vid = pickId(variantId);
    const own = ownerClause(owner, 1);
    if (vid) {
        const r = await pool.query(
            `SELECT * FROM cart_items WHERE ${own.sql} AND product_id = $2 AND variant_id = $3`,
            [own.value, pickId(productId), vid],
        );
        return mapCartItem(r.rows[0]);
    }
    const r = await pool.query(
        `SELECT * FROM cart_items WHERE ${own.sql} AND product_id = $2 AND variant_id IS NULL`,
        [own.value, pickId(productId)],
    );
    return mapCartItem(r.rows[0]);
}

// cartproduct model: createCartItem creates a new record.
export async function createCartItem({ owner, userId, productId, quantity, variantId = null, guestId = null }) {
    // Support legacy { userId } shape from reorder service
    const o = owner || { userId: userId || null, guestId: guestId || null };
    const uid = o.userId || null;
    const gid = o.guestId || null;
    const expires = gid ? guestExpiresAt() : null;
    const r = await pool.query(
        `INSERT INTO cart_items (user_id, guest_id, product_id, quantity, variant_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [uid, gid, pickId(productId), quantity, pickId(variantId) || null, expires],
    );
    return mapCartItem(r.rows[0]);
}

// cartproduct model: updateCartItemQuantity updates existing records.
export async function updateCartItemQuantity(id, quantity, owner = null) {
    if (!owner) {
        const r = await pool.query(
            `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [quantity, id],
        );
        return mapCartItem(r.rows[0]);
    }
    const own = ownerClause(owner, 3);
    const expires = owner.guestId ? guestExpiresAt() : null;
    const r = await pool.query(
        `UPDATE cart_items SET
            quantity = $1,
            expires_at = CASE WHEN guest_id IS NOT NULL THEN $4 ELSE NULL END,
            updated_at = NOW()
         WHERE id = $2 AND ${own.sql}
         RETURNING *`,
        [quantity, id, own.value, expires],
    );
    return mapCartItem(r.rows[0]);
}

// cartproduct model: findCartByOwner reads and returns records.
export async function findCartByOwner(owner) {
    await deleteExpiredCartItems();
    const own = ownerClause(owner, 1);
    const r = await pool.query(
        `SELECT * FROM cart_items
         WHERE ${own.sql}
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [own.value],
    );
    const items = await Promise.all(
        r.rows.map(async (row) => {
            const item = mapCartItem(row);
            item.productId = await findProductById(row.product_id);
            item.variant = row.variant_id ? await findVariantById(row.variant_id) : null;
            return item;
        }),
    );
    return items;
}

/** Checkout / logged-in helpers */
// cartproduct model: findCartByUser reads and returns records.
export async function findCartByUser(userId) {
    return findCartByOwner({ userId, guestId: null });
}

// cartproduct model: findCartItemById reads and returns records.
export async function findCartItemById(id) {
    const r = await pool.query(`SELECT * FROM cart_items WHERE id = $1`, [id]);
    return mapCartItem(r.rows[0]);
}

// cartproduct model: deleteCartItemForOwner deletes matching records.
export async function deleteCartItemForOwner(id, owner) {
    const own = ownerClause(owner, 2);
    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${own.sql}`, [id, own.value]);
}

// cartproduct model: deleteCartItem deletes matching records.
export async function deleteCartItem(id, userId) {
    return deleteCartItemForOwner(id, { userId, guestId: null });
}

// cartproduct model: clearCart deletes matching records.
export async function clearCart(userId) {
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
}

// cartproduct model: deleteExpiredCartItems deletes matching records.
export async function deleteExpiredCartItems() {
    const r = await pool.query(
        `DELETE FROM cart_items WHERE expires_at IS NOT NULL AND expires_at < NOW()`,
    );
    return { deleted: r.rowCount || 0 };
}

