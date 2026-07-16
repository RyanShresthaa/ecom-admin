/**
 * Cart HTTP handlers — guest or logged-in (Phase 4).
 * Owner comes from resolveCartOwner middleware (req.cartOwner).
 */
import {
    findCartItem,
    createCartItem,
    updateCartItemQuantity,
    findCartByOwner,
    findCartItemById,
    deleteCartItemForOwner,
} from '../../shared/models/cartproduct.model.js';
import { findProductById } from '../../shared/models/product.model.js';
import { findVariantForProduct } from '../../shared/models/variant.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { validateCart, purgeExpiredCarts } from '../../shared/services/cart/index.js';

function availableStock(product, variant) {
    if (variant) return Number(variant.stock);
    return Number(product.stock);
}

function ownsItem(item, owner) {
    if (!item) return false;
    if (owner.userId) return Number(item.user_id) === Number(owner.userId);
    return String(item.guest_id) === String(owner.guestId);
}

// POST /api/cart/add — adds line item to user or guest cart.
export const addToCartController = async (req, res) => {
    try {
        const owner = req.cartOwner;
        const productId = pickId(req.body.productId);
        const variantId = pickId(req.body.variantId || req.body.variant_id);
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

        let variant = null;
        if (variantId) {
            variant = await findVariantForProduct(productId, variantId);
            if (!variant) {
                return res.status(400).json({
                    message: 'Invalid variant for this product',
                    error: true,
                    success: false,
                });
            }
        } else if (product.variants?.length) {
            return res.status(400).json({
                message: 'variantId is required for this product',
                error: true,
                success: false,
            });
        }

        const existing = await findCartItem(owner, productId, variantId || null);
        const requestedQty = existing ? existing.quantity + quantity : quantity;
        const stock = availableStock(product, variant);
        if (stock < requestedQty) {
            return res.status(400).json({
                message: `Only ${stock} in stock`,
                error: true,
                success: false,
            });
        }
        if (existing) {
            const updated = await updateCartItemQuantity(existing.id, requestedQty, owner);
            return res.json({
                message: 'Cart updated',
                data: updated,
                guestId: owner.guestId || undefined,
                error: false,
                success: true,
            });
        }
        const created = await createCartItem({
            owner,
            productId,
            quantity,
            variantId: variantId || null,
        });
        return res.json({
            message: 'Added to cart',
            data: created,
            guestId: owner.guestId || undefined,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// GET /api/cart/get — fetches current user or guest cart with totals.
export const getCartController = async (req, res) => {
    try {
        const data = await findCartByOwner(req.cartOwner);
        return res.json({
            data,
            guestId: req.cartOwner.guestId || undefined,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// PUT /api/cart/update — updates quantity or variant selection in cart.
export const updateCartController = async (req, res) => {
    try {
        const owner = req.cartOwner;
        const id = pickId(req.body._id);
        if (!id) {
            return res.status(400).json({ message: 'cart id is required', error: true, success: false });
        }
        const item = await findCartItemById(id);
        if (!ownsItem(item, owner)) {
            return res.status(404).json({ message: 'Cart item not found', error: true, success: false });
        }
        const newQty = Math.max(1, Number(req.body.quantity || 1));
        const product = await findProductById(item.product_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        const variant = item.variant_id
            ? await findVariantForProduct(item.product_id, item.variant_id)
            : null;
        const stock = availableStock(product, variant);
        if (stock < newQty) {
            return res.status(400).json({
                message: `Only ${stock} in stock`,
                error: true,
                success: false,
            });
        }
        const updated = await updateCartItemQuantity(id, newQty, owner);
        return res.json({ message: 'Cart quantity updated', data: updated, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// DELETE /api/cart/delete — removes a line item from cart.
export const removeCartController = async (req, res) => {
    try {
        await deleteCartItemForOwner(pickId(req.body._id), req.cartOwner);
        return res.json({ message: 'Removed from cart', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/cart/validate — check stock/publish; optional autofix */
// POST /api/cart/validate — validates cart items, stock, and pricing.
export const validateCartController = async (req, res) => {
    try {
        const autofix = req.body?.autofix === true;
        const data = await validateCart(req.cartOwner, { autofix });
        return res.json({
            message: data.ok ? 'Cart is valid' : 'Cart has issues',
            data,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/cart/purge-expired — staff cleanup */
// POST /api/cart/purge-expired — purges expired guest carts for staff.
export const purgeExpiredCartController = async (_req, res) => {
    try {
        const data = await purgeExpiredCarts();
        return res.json({ message: 'Expired guest carts purged', data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

