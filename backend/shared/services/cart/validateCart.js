/**
 * Cart validation + expire cleanup (Phase 4).
 * No email/SMS — stock/publish checks only.
 */
import {
    findCartByOwner,
    deleteExpiredCartItems,
    updateCartItemQuantity,
    deleteCartItemForOwner,
} from '../../models/cartproduct.model.js';
import { findProductById } from '../../models/product.model.js';
import { findVariantForProduct } from '../../models/variant.model.js';
import { pickId } from '../../utils/sql.js';

// Compute effective stock for line, preferring variant inventory.
function lineStock(product, variant) {
    if (variant) return Number(variant.stock);
    return Number(product?.stock ?? 0);
}

/**
 * Validate every line: published, stock, variant still exists.
 * Optionally auto-fix quantities or remove bad lines.
 */
export async function validateCart(owner, { autofix = false } = {}) {
    // Cleanup expired rows before evaluating current cart validity.
    await deleteExpiredCartItems();
    const items = await findCartByOwner(owner);
    const issues = [];
    const valid = [];

    // Validate publish/variant/stock constraints line by line.
    for (const item of items) {
        const product = item.productId && typeof item.productId === 'object'
            ? item.productId
            : await findProductById(item.product_id || item.productId);
        const productId = pickId(product?.id || item.product_id);
        const variantId = pickId(item.variantId || item.variant_id);

        if (!product || product.publish === false) {
            issues.push({ cartItemId: item.id, code: 'unavailable', message: 'Product unavailable' });
            if (autofix) await deleteCartItemForOwner(item.id, owner);
            continue;
        }

        let variant = item.variant || null;
        if (variantId) {
            variant = await findVariantForProduct(productId, variantId);
            if (!variant) {
                issues.push({
                    cartItemId: item.id,
                    code: 'variant_unavailable',
                    message: 'Variant no longer available',
                });
                if (autofix) await deleteCartItemForOwner(item.id, owner);
                continue;
            }
        } else if (product.variants?.length) {
            issues.push({
                cartItemId: item.id,
                code: 'variant_required',
                message: 'Product now requires a variant',
            });
            if (autofix) await deleteCartItemForOwner(item.id, owner);
            continue;
        }

        const stock = lineStock(product, variant);
        const qty = Number(item.quantity);
        if (stock < 1) {
            issues.push({ cartItemId: item.id, code: 'out_of_stock', message: 'Out of stock', stock: 0 });
            if (autofix) await deleteCartItemForOwner(item.id, owner);
            continue;
        }
        if (qty > stock) {
            issues.push({
                cartItemId: item.id,
                code: 'qty_reduced',
                message: `Only ${stock} left`,
                stock,
                quantity: qty,
            });
            if (autofix) await updateCartItemQuantity(item.id, stock, owner);
            valid.push({ ...item, quantity: autofix ? stock : qty, _stock: stock });
            continue;
        }

        valid.push({ ...item, _stock: stock });
    }

    return {
        ok: issues.length === 0,
        issues,
        itemCount: valid.length,
        items: valid,
    };
}

// Remove expired cart entries and return deleted-row count/result.
export async function purgeExpiredCarts() {
    return deleteExpiredCartItems();
}
