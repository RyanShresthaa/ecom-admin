// Fulfillment constants define canonical delivery lifecycle labels.
/**
 * Fulfillment constants — delivery lifecycle used by the order status FSM.
 * Canonical casing matches the admin UI (Pending, Shipped, Delivered, …).
 */
export const DELIVERY_STATUS = Object.freeze({
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    PACKED: 'Packed',
    SHIPPED: 'Shipped',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
});

/** Ordered list for docs / OpenAPI */
export const DELIVERY_STATUS_LIST = Object.freeze(Object.values(DELIVERY_STATUS));

/** Common carriers staff can assign (free-text still allowed) */
export const CARRIERS = Object.freeze([
    'Nepal Post',
    'Pathao Parcel',
    'NCM',
    'Sundhara Express',
    'Other',
]);
