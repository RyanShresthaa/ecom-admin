/**
 * Guest → user cart merge after login.
 */
import pool from '../../config/connectDB.js';
import { pickId } from '../../utils/sql.js';
import { findProductById } from '../../models/product.model.js';
import { findVariantForProduct } from '../../models/variant.model.js';
import { readGuestId, clearGuestCookie } from '../../middleware/guestCart.js';
import { logger } from '../../utils/logger.js';

/**
 * Merge guest cart lines into the logged-in user's cart.
 * @returns {{ merged: number, skipped: number }}
 */
export async function mergeGuestCartIntoUser(userId, guestId) {
    if (!userId || !guestId) return { merged: 0, skipped: 0 };

    const client = await pool.connect();
    let merged = 0;
    let skipped = 0;
    try {
        await client.query('BEGIN');
        const guestRows = await client.query(
            `SELECT * FROM cart_items WHERE guest_id = $1 FOR UPDATE`,
            [guestId],
        );

        // Replay each guest cart line into the user cart with stock safety.
        for (const row of guestRows.rows) {
            const productId = pickId(row.product_id);
            const variantId = pickId(row.variant_id) || null;
            const qty = Math.max(1, Number(row.quantity || 1));

            const product = await findProductById(productId);
            if (!product?.publish) {
                await client.query(`DELETE FROM cart_items WHERE id = $1`, [row.id]);
                skipped += 1;
                continue;
            }

            let stock = Number(product.stock);
            if (variantId) {
                const variant = await findVariantForProduct(productId, variantId);
                if (!variant) {
                    await client.query(`DELETE FROM cart_items WHERE id = $1`, [row.id]);
                    skipped += 1;
                    continue;
                }
                stock = Number(variant.stock);
            }

            let existing;
            if (variantId) {
                existing = await client.query(
                    `SELECT * FROM cart_items
                     WHERE user_id = $1 AND product_id = $2 AND variant_id = $3 FOR UPDATE`,
                    [userId, productId, variantId],
                );
            } else {
                existing = await client.query(
                    `SELECT * FROM cart_items
                     WHERE user_id = $1 AND product_id = $2 AND variant_id IS NULL FOR UPDATE`,
                    [userId, productId],
                );
            }

            // Merge into existing cart line when product/variant already exists.
            if (existing.rows[0]) {
                const nextQty = Math.min(stock, Number(existing.rows[0].quantity) + qty);
                await client.query(
                    `UPDATE cart_items SET quantity = $1, expires_at = NULL, updated_at = NOW()
                     WHERE id = $2`,
                    [Math.max(1, nextQty), existing.rows[0].id],
                );
                await client.query(`DELETE FROM cart_items WHERE id = $1`, [row.id]);
            // Otherwise transfer guest line ownership to the user cart.
            } else {
                const capped = Math.min(stock, qty);
                if (capped < 1) {
                    await client.query(`DELETE FROM cart_items WHERE id = $1`, [row.id]);
                    skipped += 1;
                    continue;
                }
                await client.query(
                    `UPDATE cart_items
                     SET user_id = $1, guest_id = NULL, quantity = $2, expires_at = NULL, updated_at = NOW()
                     WHERE id = $3`,
                    [userId, capped, row.id],
                );
            }
            merged += 1;
        }

        await client.query('COMMIT');
        return { merged, skipped };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/** Safe wrapper for login — never fails login if merge errors */
export async function tryMergeGuestCartOnLogin(req, res, userId) {
    try {
        // Read guest cart identity from cookie and merge post-authentication.
        const guestId = readGuestId(req);
        if (!guestId) return null;
        const result = await mergeGuestCartIntoUser(userId, guestId);
        clearGuestCookie(res);
        return result;
    } catch (e) {
        logger.warn('Guest cart merge failed', { message: e.message, userId });
        return null;
    }
}
