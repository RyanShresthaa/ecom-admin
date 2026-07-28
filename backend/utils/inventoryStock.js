/**
 * Inventory engine: multi-warehouse stock, order decrement/restore, manual add/remove/transfer, audit rows.
 * Checkout reads `products.stock` (aggregate); all mutations keep warehouse rows + aggregate in sync.
 */
import {
    getDefaultWarehouseId,
    getWarehouseStockForProduct,
    insertStockMovement,
    syncProductAggregatedStock,
    sumNonDefaultWarehouseQty,
    upsertWarehouseQuantity,
    setWarehouseQuantityAbsolute,
} from '../models/inventory.model.js';
import pool from '../config/connectDB.js';

const MAX_ADJUST = 1_000_000;

function assertQty(name, q) {
    const n = Number(q);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_ADJUST || !Number.isInteger(n)) {
        throw new Error(`${name} must be a positive integer up to ${MAX_ADJUST}`);
    }
    return n;
}

async function lockProduct(client, productId) {
    const locked = await client.query(`SELECT id, name, publish FROM products WHERE id = $1 FOR UPDATE`, [productId]);
    return locked.rows[0];
}

/** Decrement sellable stock for checkout/cancel flows — FIFO: default warehouse first, then others by id. */
export async function decrementStock(client, qtyByProduct) {
    for (const [productId, qty] of qtyByProduct) {
        const q = assertQty('quantity', qty);
        const p = await lockProduct(client, productId);
        if (!p) throw new Error(`Product #${productId} not found`);
        if (!p.publish) throw new Error(`"${p.name}" is not available for sale`);

        const rows = await getWarehouseStockForProduct(productId, { forUpdate: true, client });
        let available = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
        if (available < q) {
            throw new Error(`Not enough stock for "${p.name}" (only ${available} left)`);
        }

        let need = q;
        for (const row of rows) {
            if (need <= 0) break;
            const here = Number(row.quantity || 0);
            if (here <= 0) continue;
            const take = Math.min(need, here);
            await client.query(
                `UPDATE warehouse_stock SET quantity = quantity - $1, updated_at = NOW()
                 WHERE warehouse_id = $2 AND product_id = $3`,
                [take, row.warehouse_id, productId],
            );
            const afterR = await client.query(
                `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
                [row.warehouse_id, productId],
            );
            const balanceAfter = Number(afterR.rows[0]?.quantity ?? 0);
            await insertStockMovement(client, {
                product_id: productId,
                warehouse_id: row.warehouse_id,
                delta: -take,
                balance_after: balanceAfter,
                movement_type: 'sale',
                user_id: null,
                note: 'Order checkout',
                meta: {},
            });
            need -= take;
        }
        if (need > 0) throw new Error(`Stock allocation failed for "${p.name}"`);
        await syncProductAggregatedStock(client, productId);
    }
}

/** Returns restored goods to the default warehouse (typical DC receiving). */
export async function restoreStock(client, qtyByProduct) {
    const defaultWh = await getDefaultWarehouseId(client);
    if (!defaultWh) throw new Error('Default warehouse is not configured');

    for (const [productId, qty] of qtyByProduct) {
        const q = assertQty('quantity', qty);
        await lockProduct(client, productId);
        const balance = await upsertWarehouseQuantity(client, defaultWh, productId, q);
        await insertStockMovement(client, {
            product_id: productId,
            warehouse_id: defaultWh,
            delta: q,
            balance_after: balance,
            movement_type: 'return_restore',
            user_id: null,
            note: 'Stock returned to default warehouse',
            meta: {},
        });
        await syncProductAggregatedStock(client, productId);
    }
}

export async function addStockInTransaction(client, { productId, warehouseId, quantity, userId, note, reason }) {
    const wid = warehouseId ?? (await getDefaultWarehouseId(client));
    if (!wid) throw new Error('No warehouse specified and default warehouse missing');
    const q = assertQty('quantity', quantity);
    await lockProduct(client, productId);
    const balance = await upsertWarehouseQuantity(client, wid, productId, q);
    await insertStockMovement(client, {
        product_id: productId,
        warehouse_id: wid,
        delta: q,
        balance_after: balance,
        movement_type: 'adjustment_add',
        user_id: userId,
        note: note || reason || 'Manual stock receipt',
        meta: { reason: reason || null },
    });
    await syncProductAggregatedStock(client, productId);
    return { warehouseId: wid, quantity: balance };
}

export async function removeStockInTransaction(client, { productId, warehouseId, quantity, userId, note, reason }) {
    const wid = warehouseId ?? (await getDefaultWarehouseId(client));
    if (!wid) throw new Error('No warehouse specified and default warehouse missing');
    const q = assertQty('quantity', quantity);
    await lockProduct(client, productId);

    const rows = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
        [wid, productId],
    );
    const cur = Number(rows.rows[0]?.quantity ?? 0);
    if (cur < q) {
        throw new Error(`Cannot remove ${q} units — only ${cur} at this warehouse`);
    }
    await client.query(
        `UPDATE warehouse_stock SET quantity = quantity - $1, updated_at = NOW() WHERE warehouse_id = $2 AND product_id = $3`,
        [q, wid, productId],
    );
    const afterR = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [wid, productId],
    );
    const balance = Number(afterR.rows[0]?.quantity ?? 0);
    await insertStockMovement(client, {
        product_id: productId,
        warehouse_id: wid,
        delta: -q,
        balance_after: balance,
        movement_type: 'adjustment_remove',
        user_id: userId,
        note: note || reason || 'Manual stock removal',
        meta: { reason: reason || null },
    });
    await syncProductAggregatedStock(client, productId);
    return { warehouseId: wid, quantity: balance };
}

export async function transferStockInTransaction(
    client,
    { productId, fromWarehouseId, toWarehouseId, quantity, userId, note },
) {
    if (fromWarehouseId === toWarehouseId) {
        throw new Error('fromWarehouseId and toWarehouseId must differ');
    }
    const q = assertQty('quantity', quantity);
    await lockProduct(client, productId);

    const fromR = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
        [fromWarehouseId, productId],
    );
    const fromQty = Number(fromR.rows[0]?.quantity ?? 0);
    if (fromQty < q) {
        throw new Error(`Cannot transfer ${q} units — only ${fromQty} at source warehouse`);
    }

    await client.query(
        `UPDATE warehouse_stock SET quantity = quantity - $1, updated_at = NOW() WHERE warehouse_id = $2 AND product_id = $3`,
        [q, fromWarehouseId, productId],
    );
    const fromAfter = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [fromWarehouseId, productId],
    );
    const fromBalance = Number(fromAfter.rows[0]?.quantity ?? 0);

    const toBalance = await upsertWarehouseQuantity(client, toWarehouseId, productId, q);

    await insertStockMovement(client, {
        product_id: productId,
        warehouse_id: fromWarehouseId,
        delta: -q,
        balance_after: fromBalance,
        movement_type: 'transfer_out',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        user_id: userId,
        note: note || 'Inter-warehouse transfer',
        meta: {},
    });
    await insertStockMovement(client, {
        product_id: productId,
        warehouse_id: toWarehouseId,
        delta: q,
        balance_after: toBalance,
        movement_type: 'transfer_in',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        user_id: userId,
        note: note || 'Inter-warehouse transfer',
        meta: {},
    });

    await syncProductAggregatedStock(client, productId);
    return { fromWarehouseId, toWarehouseId, fromBalance, toBalance };
}

/**
 * Apply catalog "total stock" update: adjusts default warehouse so aggregate matches `newTotal`,
 * without touching non-default warehouses (fails if newTotal < stock held elsewhere).
 */
export async function applyAbsoluteProductStockFromCatalog(client, productId, newTotal) {
    const n = Math.max(0, Math.floor(Number(newTotal)));
    if (!Number.isFinite(n)) throw new Error('Invalid stock value');
    const defaultWh = await getDefaultWarehouseId(client);
    if (!defaultWh) throw new Error('Default warehouse missing');

    await lockProduct(client, productId);
    const elsewhere = await sumNonDefaultWarehouseQty(productId, client);
    if (n < elsewhere) {
        throw new Error(
            `Cannot set total stock to ${n}: ${elsewhere} units are allocated in non-default warehouses. Transfer or remove them first.`,
        );
    }
    const defaultQty = n - elsewhere;
    await setWarehouseQuantityAbsolute(client, defaultWh, productId, defaultQty);
    await syncProductAggregatedStock(client, productId);
}

/** After creating a product row, seed default warehouse stock (initial catalog quantity). */
export async function seedWarehouseRowForNewProduct(productId, initialStock, client = null) {
    const qty = Math.max(0, Math.floor(Number(initialStock) || 0));
    if (client) {
        const defaultWh = await getDefaultWarehouseId(client);
        if (!defaultWh) return;
        await setWarehouseQuantityAbsolute(client, defaultWh, productId, qty);
        await syncProductAggregatedStock(client, productId);
        return;
    }
    const c = await pool.connect();
    try {
        await c.query('BEGIN');
        const defaultWh = await getDefaultWarehouseId(c);
        if (!defaultWh) {
            await c.query('ROLLBACK');
            return;
        }
        await setWarehouseQuantityAbsolute(c, defaultWh, productId, qty);
        await syncProductAggregatedStock(c, productId);
        await c.query('COMMIT');
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        c.release();
    }
}
