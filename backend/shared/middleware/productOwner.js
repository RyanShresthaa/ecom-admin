/**
 * Ensures Sellers mutate only their own products (Admin bypasses). Uses products.seller_id.
 */
import { findProductOwner } from '../models/product.model.js';
import { pickId } from '../utils/sql.js';

/** Seller may only edit/delete their own products; Admin may edit any. */
export async function requireProductOwner(req, res, next) {
    try {
        const id = pickId(req.body._id || req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'Product id required', error: true, success: false });
        }
        if (req.user?.role === 'Admin') return next();
        if (req.user?.role !== 'Seller') {
            return res.status(403).json({ message: 'Permission denied', error: true, success: false });
        }
        const row = await findProductOwner(id);
        if (!row) {
            return res.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        if (row.seller_id !== req.userId) {
            return res.status(403).json({ message: 'You can only manage your own products', error: true, success: false });
        }
        next();
    } catch {
        return res.status(500).json({ message: 'Permission check failed', error: true, success: false });
    }
}
