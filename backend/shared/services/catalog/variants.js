/**
 * Catalog helpers: attach variants, sync parent stock from variant sum,
 * soft-delete / restore products.
 */
import pool from '../../config/connectDB.js';
import { pickId } from '../../utils/sql.js';
import {
    findVariantsByProductId,
    replaceProductVariants,
    sumVariantStock,
} from '../../models/variant.model.js';
import { applyAbsoluteProductStockFromCatalog } from '../../utils/inventoryStock.js';

/** Attach `variants[]` and normalize SKU fields on a product shape. */
export async function withVariants(product) {
    if (!product) return null;
    const variants = await findVariantsByProductId(product.id);
    return {
        ...product,
        sku: product.sku || null,
        barcode: product.barcode || null,
        brand: product.brand || null,
        deletedAt: product.deleted_at || product.deletedAt || null,
        variants,
    };
}

export async function withVariantsMany(products) {
    // Resolve variants for every product in parallel.
    if (!products?.length) return [];
    return Promise.all(products.map((p) => withVariants(p)));
}

/**
 * After variants change: parent products.stock = SUM(variant.stock),
 * and keep default-warehouse aggregate in sync.
 */
export async function syncProductStockFromVariants(productId, client = null) {
    // Keep parent product stock equal to summed variant stock.
    const ownClient = !client;
    const c = client || (await pool.connect());
    try {
        if (ownClient) await c.query('BEGIN');
        const total = await sumVariantStock(productId, c);
        await applyAbsoluteProductStockFromCatalog(c, pickId(productId), total);
        if (ownClient) await c.query('COMMIT');
        return total;
    } catch (e) {
        if (ownClient) await c.query('ROLLBACK');
        throw e;
    } finally {
        if (ownClient) c.release();
    }
}

/**
 * Persist variants array and sync parent stock.
 * @returns {Promise<object[]>} saved variants
 */
export async function saveProductVariants(productId, variants) {
    // Replace variants and sync parent stock in one transaction.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const saved = await replaceProductVariants(productId, variants, client);
        if (saved.length) {
            const total = await sumVariantStock(productId, client);
            await applyAbsoluteProductStockFromCatalog(client, pickId(productId), total);
        }
        await client.query('COMMIT');
        return saved;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
