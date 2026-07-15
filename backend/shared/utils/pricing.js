/** Unit price after product discount (percent). */
export function unitPriceAfterDiscount(price, discountPercent = 0) {
    const p = Number(price) || 0;
    const d = Number(discountPercent) || 0;
    const off = Math.ceil((p * d) / 100);
    return Math.max(0, p - off);
}

export function lineTotal(unitPrice, quantity) {
    return Number((unitPrice * Math.max(1, Number(quantity))).toFixed(2));
}

export function applyCoupon(subtotal, coupon = null) {
    if (!coupon) return { discount: 0, code: null };
    const min = Number(coupon.min_order_amt) || 0;
    if (subtotal < min) {
        throw new Error(`Minimum order ${min} required for this coupon`);
    }
    let discount;
    if (coupon.discount_type === 'percent') {
        discount = Number(((subtotal * Number(coupon.discount_value)) / 100).toFixed(2));
    } else {
        discount = Math.min(subtotal, Number(coupon.discount_value));
    }
    return { discount, code: coupon.code };
}

export function calcTax(amount, taxPercent) {
    return Number(((amount * Number(taxPercent)) / 100).toFixed(2));
}

export function calcShipping(subtotalAfterCoupon, flatFee, freeMin) {
    if (subtotalAfterCoupon >= Number(freeMin)) return 0;
    return Number(flatFee) || 0;
}

export function buildCheckoutSummary({ lines, taxPercent, flatShipping, freeShippingMin, coupon }) {
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const { discount: couponDiscount, code: couponCode } = applyCoupon(subtotal, coupon);
    const afterCoupon = Math.max(0, subtotal - couponDiscount);
    const taxAmt = calcTax(afterCoupon, taxPercent);
    const shippingAmt = calcShipping(afterCoupon, flatShipping, freeShippingMin);
    const totalAmt = Number((afterCoupon + taxAmt + shippingAmt).toFixed(2));

    return {
        subtotal,
        couponDiscount,
        couponCode,
        afterCoupon,
        taxAmt,
        shippingAmt,
        totalAmt,
        lines,
    };
}
