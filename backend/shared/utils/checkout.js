/**
 * Builds validated checkout lines from cart or list_items.
 * Phase 2: optional variantId.
 * Phase 3: address-aware shipping zones (falls back to shop flat fee).
 */
import { findProductById } from '../models/product.model.js';
import { findVariantForProduct } from '../models/variant.model.js';
import { findCartByUser } from '../models/cartproduct.model.js';
import { findCouponByCode } from '../models/coupon.model.js';
import { findAddressByIdAndUser } from '../models/address.model.js';
import { getShopSettingsMap } from '../models/settings.model.js';
import { pickId } from './sql.js';
import { unitPriceAfterDiscount, lineTotal, applyCoupon, calcTax } from './pricing.js';
import { resolveShippingRate } from '../services/fulfillment/shippingRates.js';

/**
 * Build validated checkout from request body or user's cart.
 * @param {{ userId, list_items?, couponCode?, useCart?, addressId? }} opts
 */
// Resolve checkout lines from cart/direct items with coupon and shipping context.
export async function resolveCheckoutLines({ userId, list_items, couponCode, useCart, addressId }) {
    let rawItems = list_items;

    if (useCart || !rawItems?.length) {
        const cart = await findCartByUser(userId);
        if (!cart?.length) throw new Error('Cart is empty');
        rawItems = cart.map((row) => ({
            productId: row.productId,
            variantId: row.variantId || row.variant?.id || null,
            quantity: row.quantity,
        }));
    }

    if (!rawItems?.length) throw new Error('No items to checkout');

    const lines = [];
    for (const el of rawItems) {
        const productId = pickId(el.productId?._id ?? el.productId?.id ?? el.productId);
        const variantId = pickId(el.variantId || el.variant_id);
        const quantity = Math.max(1, Number(el.quantity || 1));
        const product = await findProductById(productId);
        if (!product) throw new Error(`Product #${productId} not found`);
        if (!product.publish) throw new Error(`"${product.name}" is not available`);

        let variant = null;
        let availableStock = Number(product.stock);
        let basePrice = Number(product.price);

        if (variantId) {
            variant = await findVariantForProduct(productId, variantId);
            if (!variant) throw new Error(`Variant #${variantId} not found for "${product.name}"`);
            availableStock = Number(variant.stock);
            if (variant.price != null) basePrice = Number(variant.price);
        } else if (product.variants?.length) {
            throw new Error(`Please select a variant for "${product.name}"`);
        }

        if (availableStock < quantity) {
            const label = variant
                ? `${product.name} (${variant.size}/${variant.color})`
                : product.name;
            throw new Error(`Not enough stock for "${label}" (only ${availableStock} left)`);
        }

        const unitPrice = unitPriceAfterDiscount(basePrice, product.discount);
        lines.push({
            productId: product.id,
            variantId: variant?.id || null,
            variant,
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

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const { discount: couponDiscount, code: couponCodeResolved } = applyCoupon(subtotal, coupon);
    const afterCoupon = Math.max(0, subtotal - couponDiscount);
    const taxAmt = calcTax(afterCoupon, settings.tax_percent);

    let address = null;
    const addrId = pickId(addressId);
    if (addrId) {
        address = await findAddressByIdAndUser(addrId, userId);
        if (!address) throw new Error('Invalid delivery address');
    }

    const shipping = await resolveShippingRate(address, afterCoupon);
    const shippingAmt = shipping.amount;
    const totalAmt = Number((afterCoupon + taxAmt + shippingAmt).toFixed(2));

    // Build pricing summary with coupon, VAT/tax, and shipping for checkout.
    const summary = {
        subtotal,
        couponDiscount,
        couponCode: couponCodeResolved,
        afterCoupon,
        taxAmt,
        shippingAmt,
        totalAmt,
        lines,
        shipping,
    };

    return { summary, coupon, settings, address };
}
