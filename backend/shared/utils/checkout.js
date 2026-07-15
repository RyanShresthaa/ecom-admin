/**
 * Builds validated checkout lines from cart or list_items.
 * Used by order preview, COD, and online pay. See also utils/pricing.js, placeOrder.js
 */
import { findProductById } from '../models/product.model.js';
import { findCartByUser } from '../models/cartproduct.model.js';
import { findCouponByCode } from '../models/coupon.model.js';
import { getShopSettingsMap } from '../models/settings.model.js';
import { pickId } from './sql.js';
import { unitPriceAfterDiscount, lineTotal, buildCheckoutSummary } from './pricing.js';

/**
 * Build validated checkout from request body or user's cart.
 * @param {{ userId, list_items?, couponCode?, useCart? }} opts
 */
export async function resolveCheckoutLines({ userId, list_items, couponCode, useCart }) {
    let rawItems = list_items;

    if (useCart || !rawItems?.length) {
        const cart = await findCartByUser(userId);
        if (!cart?.length) throw new Error('Cart is empty');
        rawItems = cart.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
        }));
    }

    if (!rawItems?.length) throw new Error('No items to checkout');

    const lines = [];
    for (const el of rawItems) {
        const productId = pickId(el.productId?._id ?? el.productId);
        const quantity = Math.max(1, Number(el.quantity || 1));
        const product = await findProductById(productId);
        if (!product) throw new Error(`Product #${productId} not found`);
        if (!product.publish) throw new Error(`"${product.name}" is not available`);
        if (Number(product.stock) < quantity) {
            throw new Error(`Not enough stock for "${product.name}" (only ${product.stock} left)`);
        }
        const unitPrice = unitPriceAfterDiscount(product.price, product.discount);
        lines.push({
            productId: product.id,
            product,
            quantity,
            unitPrice,
            lineTotal: lineTotal(unitPrice, quantity),
        });
    }

    const settings = await getShopSettingsMap();
    let coupon = null;
    if (couponCode) {
        coupon = await findCouponByCode(couponCode);
        if (!coupon) throw new Error('Invalid coupon code');
    }

    const summary = buildCheckoutSummary({
        lines,
        taxPercent: settings.tax_percent,
        flatShipping: settings.flat_shipping_fee,
        freeShippingMin: settings.free_shipping_min,
        coupon,
    });

    return { summary, coupon, settings };
}
