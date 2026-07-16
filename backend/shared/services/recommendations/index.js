/**
 * Product recommendations — manual related rows + co-purchase from order history.
 */
import pool from '../../config/connectDB.js';
import { pickId } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import { findProductById, findProductsByCategory } from '../../models/product.model.js';

// Return related products using manual links, co-purchase, then category fallback.
export async function listRelated(productId, { limit = 8 } = {}) {
    if (!(await isEnabled('product_recommendations'))) {
        // Soft fallback: same category
        const product = await findProductById(productId);
        if (!product?.category_id) return [];
        const peers = await findProductsByCategory([product.category_id], limit + 1);
        return peers.filter((p) => pickId(p.id) !== pickId(productId)).slice(0, limit);
    }

    // Use manually curated relation rows when available.
    const r = await pool.query(
        `SELECT related_product_id, rank, source
         FROM product_related
         WHERE product_id = $1
         ORDER BY rank ASC, related_product_id ASC
         LIMIT $2`,
        [pickId(productId), limit],
    );
    if (r.rows.length) {
        const products = [];
        for (const row of r.rows) {
            const p = await findProductById(row.related_product_id);
            if (p) products.push({ ...p, recommendationSource: row.source, rank: row.rank });
        }
        return products;
    }

    // Co-purchase: products bought with this one in the same order_id
    // Build co-purchase recommendations from historical same-order joins.
    const co = await pool.query(
        `SELECT o2.product_id, COUNT(*)::int AS score
         FROM orders o1
         INNER JOIN orders o2 ON o2.order_id = o1.order_id AND o2.product_id <> o1.product_id
         WHERE o1.product_id = $1
         GROUP BY o2.product_id
         ORDER BY score DESC
         LIMIT $2`,
        [pickId(productId), limit],
    );
    if (co.rows.length) {
        const products = [];
        for (const row of co.rows) {
            const p = await findProductById(row.product_id);
            if (p) products.push({ ...p, recommendationSource: 'co_purchase', rank: row.score });
        }
        return products;
    }

    const product = await findProductById(productId);
    if (!product?.category_id) return [];
    const peers = await findProductsByCategory([product.category_id], limit + 1);
    return peers
        .filter((p) => pickId(p.id) !== pickId(productId))
        .slice(0, limit)
        .map((p) => ({ ...p, recommendationSource: 'category', rank: 0 }));
}

// Create or update one related-product mapping.
export async function setRelated(productId, relatedProductId, { rank = 0, source = 'manual' } = {}) {
    await pool.query(
        `INSERT INTO product_related (product_id, related_product_id, rank, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, related_product_id) DO UPDATE SET rank = EXCLUDED.rank, source = EXCLUDED.source`,
        [pickId(productId), pickId(relatedProductId), Number(rank) || 0, source],
    );
    return { ok: true };
}

// Remove one related-product mapping.
export async function removeRelated(productId, relatedProductId) {
    await pool.query(
        `DELETE FROM product_related WHERE product_id = $1 AND related_product_id = $2`,
        [pickId(productId), pickId(relatedProductId)],
    );
    return { ok: true };
}
