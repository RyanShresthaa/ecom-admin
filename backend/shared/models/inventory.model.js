// inventory model: handles inventory table/entity CRUD and query helpers.
/**
 * PostgreSQL: `warehouses`, `warehouse_stock`, `stock_movements` — multi-location inventory + audit trail.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

let defaultWarehouseIdCache = null;

// inventory model: getDefaultWarehouseId reads and returns records.
export async function getDefaultWarehouseId(client = null) {
    if (defaultWarehouseIdCache && !client) return defaultWarehouseIdCache;
    const q = client || pool;
    const r = await q.query(`SELECT id FROM warehouses WHERE is_default = true ORDER BY id LIMIT 1`);
    const id = r.rows[0]?.id;
    if (!client && id) defaultWarehouseIdCache = id;
    return id;
}

// inventory model: invalidateDefaultWarehouseCache runs model logic/query operations.
export function invalidateDefaultWarehouseCache() {
    defaultWarehouseIdCache = null;
}

// inventory model: listWarehouses reads and returns records.
export async function listWarehouses(client = null) {
    const q = client || pool;
    const r = await q.query(`SELECT * FROM warehouses ORDER BY is_default DESC, id`);
    return mapRows(r.rows);
}

// inventory model: createWarehouseRecord creates a new record.
export async function createWarehouseRecord({ code, name, is_default = false }, client = null) {
    const q = client || pool;
    const r = await q.query(
        `INSERT INTO warehouses (code, name, is_default) VALUES ($1, $2, $3) RETURNING *`,
        [String(code).trim().slice(0, 32), String(name).trim().slice(0, 200), Boolean(is_default)],
    );
    invalidateDefaultWarehouseCache();
    return mapRow(r.rows[0]);
}

// inventory model: getWarehouseStockForProduct reads and returns records.
export async function getWarehouseStockForProduct(productId, { forUpdate = false, client = null } = {}) {
    const q = client || pool;
    const lock = forUpdate ? 'FOR UPDATE OF ws' : '';
    const r = await q.query(
        `SELECT ws.warehouse_id, ws.quantity, ws.updated_at, w.code AS warehouse_code, w.name AS warehouse_name, w.is_default
         FROM warehouse_stock ws
         INNER JOIN warehouses w ON w.id = ws.warehouse_id
         WHERE ws.product_id = $1
         ORDER BY w.is_default DESC, ws.warehouse_id
         ${lock}`,
        [productId],
    );
    return r.rows;
}

// inventory model: sumNonDefaultWarehouseQty reads and returns records.
export async function sumNonDefaultWarehouseQty(productId, client) {
    const r = await client.query(
        `SELECT COALESCE(SUM(ws.quantity), 0)::bigint AS s
         FROM warehouse_stock ws
         INNER JOIN warehouses w ON w.id = ws.warehouse_id
         WHERE ws.product_id = $1 AND w.is_default = false`,
        [productId],
    );
    return Number(r.rows[0]?.s || 0);
}

// inventory model: insertStockMovement creates a new record.
export async function insertStockMovement(
    client,
    {
        product_id,
        warehouse_id = null,
        delta,
        balance_after = null,
        movement_type,
        from_warehouse_id = null,
        to_warehouse_id = null,
        user_id = null,
        note = '',
        meta = {},
    },
) {
    await client.query(
        `INSERT INTO stock_movements (
            product_id, warehouse_id, delta, balance_after, movement_type,
            from_warehouse_id, to_warehouse_id, user_id, note, meta
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
        [
            product_id,
            warehouse_id,
            delta,
            balance_after,
            movement_type,
            from_warehouse_id,
            to_warehouse_id,
            user_id,
            String(note || '').slice(0, 2000),
            JSON.stringify(meta || {}),
        ],
    );
}

// inventory model: listStockMovements reads and returns records.
export async function listStockMovements({ productId, limit = 100, skip = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (productId) {
        params.push(productId);
        where += ` AND product_id = $${params.length}`;
    }
    const lim = params.length + 1;
    const off = params.length + 2;
    params.push(Math.min(500, limit), skip);
    const r = await pool.query(
        `SELECT sm.*, u.name AS user_name, p.name AS product_name
         FROM stock_movements sm
         LEFT JOIN users u ON u.id = sm.user_id
         LEFT JOIN products p ON p.id = sm.product_id
         ${where}
         ORDER BY sm.created_at DESC
         LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

// inventory model: upsertWarehouseQuantity runs model logic/query operations.
export async function upsertWarehouseQuantity(client, warehouseId, productId, deltaQty) {
    await client.query(
        `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, product_id) DO UPDATE
         SET quantity = warehouse_stock.quantity + EXCLUDED.quantity,
             updated_at = NOW()`,
        [warehouseId, productId, deltaQty],
    );
    const r = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseId, productId],
    );
    return Number(r.rows[0]?.quantity ?? 0);
}

// inventory model: setWarehouseQuantityAbsolute runs model logic/query operations.
export async function setWarehouseQuantityAbsolute(client, warehouseId, productId, qty) {
    const q = Math.max(0, Math.floor(Number(qty)));
    await client.query(
        `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, product_id) DO UPDATE
         SET quantity = GREATEST(0, EXCLUDED.quantity), updated_at = NOW()`,
        [warehouseId, productId, q],
    );
    const r = await client.query(
        `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseId, productId],
    );
    return Number(r.rows[0]?.quantity ?? 0);
}

// inventory model: syncProductAggregatedStock runs model logic/query operations.
export async function syncProductAggregatedStock(client, productId) {
    await client.query(
        `UPDATE products SET stock = (
            SELECT COALESCE(SUM(quantity), 0)::integer FROM warehouse_stock WHERE product_id = $1
        ), updated_at = NOW() WHERE id = $1`,
        [productId],
    );
}

