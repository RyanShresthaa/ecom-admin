/**
 * Inventory HTTP: add/remove/transfer stock, warehouse list, per-product breakdown, movement history.
 * Sellers may only touch their own products; Admins may touch any.
 */
import pool from '../../shared/config/connectDB.js';
import { pickId } from '../../shared/utils/sql.js';
import { findProductOwner } from '../../shared/models/product.model.js';
import {
    listWarehouses,
    listStockMovements,
    createWarehouseRecord,
    getWarehouseStockForProduct,
} from '../../shared/models/inventory.model.js';
import {
    addStockInTransaction,
    removeStockInTransaction,
    transferStockInTransaction,
} from '../../shared/utils/inventoryStock.js';

async function assertInventoryAccess(req, productId) {
    const pid = pickId(productId);
    if (!pid) {
        const err = new Error('productId required');
        err.status = 400;
        throw err;
    }
    const role = req.user?.role;
    if (role === 'Admin') return pid;
    if (role === 'Seller') {
        const row = await findProductOwner(pid);
        if (!row || Number(row.seller_id) !== Number(req.userId)) {
            const err = new Error('You can only manage inventory for your own products');
            err.status = 403;
            throw err;
        }
        return pid;
    }
    const err = new Error('Permission denied');
    err.status = 403;
    throw err;
}

export async function listWarehousesController(req, res) {
    try {
        const data = await listWarehouses();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function createWarehouseController(req, res) {
    try {
        const { code, name } = req.body || {};
        if (!code || !name) {
            return res.status(400).json({ message: 'code and name are required', error: true, success: false });
        }
        const data = await createWarehouseRecord({ code, name, is_default: false });
        return res.status(201).json({ message: 'Warehouse created', data, error: false, success: true });
    } catch (e) {
        if (e.code === '23505' || String(e.message).toLowerCase().includes('duplicate')) {
            return res.status(409).json({ message: 'Warehouse code already exists', error: true, success: false });
        }
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getProductInventoryBreakdownController(req, res) {
    try {
        const productId = await assertInventoryAccess(req, req.params.productId);
        const rows = await getWarehouseStockForProduct(productId, { forUpdate: false });
        const total = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
        return res.json({ data: { productId, total, warehouses: rows }, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function listInventoryMovementsController(req, res) {
    try {
        const productId = req.query.productId ? pickId(req.query.productId) : null;
        if (req.user?.role !== 'Admin' && !productId) {
            return res.status(400).json({ message: 'productId query is required for sellers', error: true, success: false });
        }
        if (productId) await assertInventoryAccess(req, productId);
        const data = await listStockMovements({
            productId: productId || undefined,
            limit: Number(req.query.limit) || 100,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function addStockController(req, res) {
    try {
        const { productId, warehouseId, quantity, reason, note } = req.body || {};
        const pid = await assertInventoryAccess(req, productId);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await addStockInTransaction(client, {
                productId: pid,
                warehouseId: warehouseId != null ? pickId(warehouseId) : null,
                quantity,
                userId: req.userId,
                reason,
                note,
            });
            await client.query('COMMIT');
            return res.status(201).json({ message: 'Stock added', data: result, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message, error: true, success: false });
    }
}

export async function removeStockController(req, res) {
    try {
        const { productId, warehouseId, quantity, reason, note } = req.body || {};
        const pid = await assertInventoryAccess(req, productId);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await removeStockInTransaction(client, {
                productId: pid,
                warehouseId: warehouseId != null ? pickId(warehouseId) : null,
                quantity,
                userId: req.userId,
                reason,
                note,
            });
            await client.query('COMMIT');
            return res.json({ message: 'Stock removed', data: result, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message, error: true, success: false });
    }
}

export async function transferStockController(req, res) {
    try {
        const { productId, fromWarehouseId, toWarehouseId, quantity, note } = req.body || {};
        const pid = await assertInventoryAccess(req, productId);
        const fromW = pickId(fromWarehouseId);
        const toW = pickId(toWarehouseId);
        if (!fromW || !toW) {
            return res.status(400).json({ message: 'fromWarehouseId and toWarehouseId are required', error: true, success: false });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await transferStockInTransaction(client, {
                productId: pid,
                fromWarehouseId: fromW,
                toWarehouseId: toW,
                quantity,
                userId: req.userId,
                note,
            });
            await client.query('COMMIT');
            return res.json({ message: 'Stock transferred', data: result, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message, error: true, success: false });
    }
}
