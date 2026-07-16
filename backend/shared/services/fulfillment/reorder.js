/**
 * Reorder: copy a past order group's lines into the customer's cart.
 */
import { pickId } from '../../utils/sql.js';
import { findOrdersByOrderGroupId, findOrderById } from '../../models/order.model.js';
import { findProductById } from '../../models/product.model.js';
import { findVariantForProduct } from '../../models/variant.model.js';
import { findCartItem, createCartItem, updateCartItemQuantity } from '../../models/cartproduct.model.js';

/**
 * @param {{ userId: number, orderGroupId?: string, orderRowId?: number }} opts
 */
export async function reorderToCart(opts) {
    // Resolve all prior order lines targeted for reorder action.
    const userId = opts.userId;
    let lines = [];
    if (opts.orderGroupId) {
        lines = await findOrdersByOrderGroupId(String(opts.orderGroupId));
    } else if (opts.orderRowId) {
        const one = await findOrderById(pickId(opts.orderRowId));
        if (one) {
            lines = one.orderId
                ? await findOrdersByOrderGroupId(one.orderId)
                : [one];
        }
    }
    if (!lines.length) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }
    // Validate ownership and product availability before cart insertion.
    if (lines.some((l) => Number(l.userId) !== Number(userId))) {
        const err = new Error('Permission denied');
        err.status = 403;
        throw err;
    }

    const added = [];
    const skipped = [];

    // Recreate each previous line in cart while enforcing current stock rules.
    for (const line of lines) {
        const productId = pickId(line.productId);
        const variantId =
            pickId(line.variantId || line.variant_id || line.product_details?.variantId) || null;
        const qty = Math.max(1, Number(line.quantity || line.product_details?.quantity || 1));

        const product = await findProductById(productId);
        if (!product || !product.publish) {
            skipped.push({ productId, reason: 'unavailable' });
            continue;
        }

        let variant = null;
        if (variantId) {
            variant = await findVariantForProduct(productId, variantId);
            if (!variant) {
                skipped.push({ productId, variantId, reason: 'variant_unavailable' });
                continue;
            }
            if (Number(variant.stock) < qty) {
                skipped.push({ productId, variantId, reason: 'insufficient_stock', stock: variant.stock });
                continue;
            }
        } else if (product.variants?.length) {
            skipped.push({ productId, reason: 'variant_required' });
            continue;
        } else if (Number(product.stock) < qty) {
            skipped.push({ productId, reason: 'insufficient_stock', stock: product.stock });
            continue;
        }

        const existing = await findCartItem(userId, productId, variantId);
        if (existing) {
            const nextQty = existing.quantity + qty;
            const stock = variant ? Number(variant.stock) : Number(product.stock);
            if (stock < nextQty) {
                skipped.push({ productId, variantId, reason: 'insufficient_stock', stock });
                continue;
            }
            const updated = await updateCartItemQuantity(existing.id, nextQty);
            added.push(updated);
        } else {
            const created = await createCartItem({ userId, productId, quantity: qty, variantId });
            added.push(created);
        }
    }

    return { added, skipped, orderGroupId: lines[0].orderId };
}
