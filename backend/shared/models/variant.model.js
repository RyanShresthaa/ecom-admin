// variant model: handles variant table/entity CRUD and query helpers.
/**
 * PostgreSQL: `product_variants` — per-size/color SKU, stock, optional price/image.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

// variant model: mapVariant reads and returns records.
export function mapVariant(row) {
    if (!row) return null;
    const v = mapRow(row);
    v.productId = v.product_id;
    v.price = v.price == null ? null : Number(v.price);
    v.stock = Number(v.stock ?? 0);
    return v;
}

// variant model: findVariantsByProductId reads and returns records.
export async function findVariantsByProductId(productId, client = pool) {
    const r = await client.query(
        `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
        [pickId(productId)],
    );
    return mapRows(r.rows).map(mapVariant);
}

// variant model: findVariantById reads and returns records.
export async function findVariantById(id, client = pool) {
    const r = await client.query(`SELECT * FROM product_variants WHERE id = $1`, [pickId(id)]);
    return mapVariant(r.rows[0]);
}

// variant model: findVariantForProduct reads and returns records.
export async function findVariantForProduct(productId, variantId, client = pool) {
    const r = await client.query(
        `SELECT * FROM product_variants WHERE id = $1 AND product_id = $2`,
        [pickId(variantId), pickId(productId)],
    );
    return mapVariant(r.rows[0]);
}

// variant model: sumVariantStock reads and returns records.
export async function sumVariantStock(productId, client = pool) {
    const r = await client.query(
        `SELECT COALESCE(SUM(stock), 0)::int AS total FROM product_variants WHERE product_id = $1`,
        [pickId(productId)],
    );
    return Number(r.rows[0]?.total || 0);
}

/**
 * Replace all variants for a product (create / update / delete by id).
 * Incoming rows: { id?, size, color, sku, stock, price?, image? }
 */
// variant model: replaceProductVariants updates existing records.
export async function replaceProductVariants(productId, variants, client = pool) {
    const pid = pickId(productId);
    const list = Array.isArray(variants) ? variants : [];
    const existing = await findVariantsByProductId(pid, client);
    const keepIds = new Set();

    const result = [];
    for (const raw of list) {
        const size = String(raw.size ?? '').trim();
        const color = String(raw.color ?? '').trim();
        let sku = String(raw.sku ?? '').trim();
        if (!sku) {
            sku = `SKU-${pid}-${size || 'X'}-${color || 'X'}`.replace(/\s+/g, '-').toUpperCase();
        }
        const stock = Math.max(0, Number(raw.stock ?? 0) || 0);
        const price =
            raw.price === null || raw.price === undefined || raw.price === ''
                ? null
                : Number(raw.price);
        const image = raw.image ? String(raw.image) : null;
        const existingId = pickId(raw.id);

        if (existingId && existing.some((e) => e.id === existingId)) {
            const r = await client.query(
                `UPDATE product_variants SET
                    size = $1, color = $2, sku = $3, stock = $4, price = $5, image = $6, updated_at = NOW()
                 WHERE id = $7 AND product_id = $8
                 RETURNING *`,
                [size, color, sku, stock, price, image, existingId, pid],
            );
            keepIds.add(existingId);
            result.push(mapVariant(r.rows[0]));
        } else {
            const r = await client.query(
                `INSERT INTO product_variants (product_id, size, color, sku, stock, price, image)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [pid, size, color, sku, stock, price, image],
            );
            keepIds.add(r.rows[0].id);
            result.push(mapVariant(r.rows[0]));
        }
    }

    for (const e of existing) {
        if (!keepIds.has(e.id)) {
            await client.query(`DELETE FROM product_variants WHERE id = $1 AND product_id = $2`, [
                e.id,
                pid,
            ]);
        }
    }

    return result;
}

/** Decrement variant stock inside an open transaction. */
// variant model: decrementVariantStock updates existing records.
export async function decrementVariantStock(client, qtyByVariant) {
    for (const [variantId, qty] of qtyByVariant) {
        const q = Math.max(1, Number(qty));
        const r = await client.query(
            `UPDATE product_variants
             SET stock = stock - $1, updated_at = NOW()
             WHERE id = $2 AND stock >= $1
             RETURNING *`,
            [q, pickId(variantId)],
        );
        if (!r.rows[0]) {
            throw new Error(`Not enough stock for variant #${variantId}`);
        }
    }
}

/** Restore variant stock inside an open transaction. */
// variant model: incrementVariantStock updates existing records.
export async function incrementVariantStock(client, qtyByVariant) {
    for (const [variantId, qty] of qtyByVariant) {
        const q = Math.max(1, Number(qty));
        await client.query(
            `UPDATE product_variants
             SET stock = stock + $1, updated_at = NOW()
             WHERE id = $2`,
            [q, pickId(variantId)],
        );
    }
}

