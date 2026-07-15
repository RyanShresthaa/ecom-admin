/**
 * Cart HTTP handlers — delegates to `cartproduct.model.js` with user scoping.
 */
import {
    findCartItem,
    createCartItem,
    updateCartItemQuantity,
    findCartByUser,
    findCartItemById,
    deleteCartItem,
} from '../../shared/models/cartproduct.model.js';
import { findProductById } from '../../shared/models/product.model.js';
import { pickId } from '../../shared/utils/sql.js';

export const addToCartController = async (req, res) => {
    try {
        const userId = req.userId;
        const productId = pickId(req.body.productId);
        const quantity = Number(req.body.quantity || 1);
        if (!productId) {
            return res.status(400).json({ message: 'productId is required', error: true, success: false });
        }
        const product = await findProductById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        if (!product.publish) {
            return res.status(400).json({ message: 'Product is not available', error: true, success: false });
        }
        const existing = await findCartItem(userId, productId);
        const requestedQty = existing ? existing.quantity + quantity : quantity;
        if (Number(product.stock) < requestedQty) {
            return res.status(400).json({
                message: `Only ${product.stock} in stock`,
                error: true,
                success: false,
            });
        }
        if (existing) {
            const updated = await updateCartItemQuantity(existing.id, requestedQty);
            return res.json({ message: 'Cart updated', data: updated, error: false, success: true });
        }
        const created = await createCartItem({ userId, productId, quantity });
        return res.json({ message: 'Added to cart', data: created, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getCartController = async (req, res) => {
    try {
        const data = await findCartByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const updateCartController = async (req, res) => {
    try {
        const id = pickId(req.body._id);
        if (!id) {
            return res.status(400).json({ message: 'cart id is required', error: true, success: false });
        }
        const item = await findCartItemById(id);
        if (!item || item.user_id !== req.userId) {
            return res.status(404).json({ message: 'Cart item not found', error: true, success: false });
        }
        const newQty = Math.max(1, Number(req.body.quantity || 1));
        const product = await findProductById(item.product_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        if (Number(product.stock) < newQty) {
            return res.status(400).json({
                message: `Only ${product.stock} in stock`,
                error: true,
                success: false,
            });
        }
        const updated = await updateCartItemQuantity(id, newQty);
        return res.json({ message: 'Cart quantity updated', data: updated, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const removeCartController = async (req, res) => {
    try {
        await deleteCartItem(pickId(req.body._id), req.userId);
        return res.json({ message: 'Removed from cart', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
