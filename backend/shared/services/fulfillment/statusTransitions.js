/**
 * Order delivery status FSM.
 * Normalizes legacy lowercase values (e.g. "pending") and validates transitions.
 */
import { DELIVERY_STATUS } from './constants.js';

const {
    PENDING,
    CONFIRMED,
    PROCESSING,
    PACKED,
    SHIPPED,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED,
    RETURNED,
} = DELIVERY_STATUS;

/** Aliases → canonical status */
const ALIASES = Object.freeze({
    pending: PENDING,
    confirmed: CONFIRMED,
    processing: PROCESSING,
    packed: PACKED,
    shipped: SHIPPED,
    'out for delivery': OUT_FOR_DELIVERY,
    out_for_delivery: OUT_FOR_DELIVERY,
    delivered: DELIVERED,
    cancelled: CANCELLED,
    canceled: CANCELLED,
    returned: RETURNED,
});

/**
 * Allowed forward / side transitions.
 * Terminal: Delivered (except → Returned), Cancelled, Returned.
 */
const ALLOWED = Object.freeze({
    [PENDING]: [CONFIRMED, PROCESSING, PACKED, SHIPPED, CANCELLED, RETURNED],
    [CONFIRMED]: [PROCESSING, PACKED, SHIPPED, CANCELLED, RETURNED],
    [PROCESSING]: [PACKED, SHIPPED, CANCELLED, RETURNED],
    [PACKED]: [SHIPPED, CANCELLED, RETURNED],
    [SHIPPED]: [OUT_FOR_DELIVERY, DELIVERED, RETURNED, CANCELLED],
    [OUT_FOR_DELIVERY]: [DELIVERED, RETURNED],
    [DELIVERED]: [RETURNED],
    [CANCELLED]: [],
    [RETURNED]: [],
});

// Normalize delivery statuses across legacy and canonical values.
export function normalizeDeliveryStatus(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    const lower = s.toLowerCase();
    if (ALIASES[lower]) return ALIASES[lower];
    // Already canonical
    if (Object.values(DELIVERY_STATUS).includes(s)) return s;
    // Title-case fallback for unknown-but-close values
    const titled = s.replace(/\b\w/g, (c) => c.toUpperCase());
    if (Object.values(DELIVERY_STATUS).includes(titled)) return titled;
    return s;
}

// Identify terminal delivery statuses with no forward transitions.
export function isTerminalDelivery(status) {
    const n = normalizeDeliveryStatus(status);
    return n === CANCELLED || n === RETURNED;
}

/**
 * Validate moving from → to. Same status is always allowed (no-op).
 * @throws Error with status 400 when illegal
 */
export function assertDeliveryTransition(fromRaw, toRaw) {
    // Enforce allowed status transitions while tolerating legacy rows.
    const from = normalizeDeliveryStatus(fromRaw) || PENDING;
    const to = normalizeDeliveryStatus(toRaw);
    if (!to) {
        const err = new Error('delivery_status is required');
        err.status = 400;
        throw err;
    }
    if (from === to) return { from, to };

    const allowed = ALLOWED[from];
    if (!allowed) {
        // Unknown previous status — allow move to any known status (legacy rows)
        if (Object.values(DELIVERY_STATUS).includes(to)) return { from, to };
        const err = new Error(`Unknown delivery status "${toRaw}"`);
        err.status = 400;
        throw err;
    }
    if (!allowed.includes(to)) {
        const err = new Error(
            `Cannot move delivery status from "${from}" to "${to}". Allowed: ${allowed.join(', ') || '(none)'}`,
        );
        err.status = 400;
        throw err;
    }
    return { from, to };
}

/**
 * Extra column patches when entering Shipped / Delivered.
 */
export function fulfillmentTimestamps(nextStatus, previous = {}) {
    // Stamp shipped/delivered timestamps when entering fulfillment milestones.
    const to = normalizeDeliveryStatus(nextStatus);
    const patch = {};
    if (to === SHIPPED || to === OUT_FOR_DELIVERY) {
        if (!previous.shipped_at && !previous.shippedAt) {
            patch.shipped_at = new Date().toISOString();
        }
    }
    if (to === DELIVERED) {
        if (!previous.shipped_at && !previous.shippedAt) {
            patch.shipped_at = new Date().toISOString();
        }
        if (!previous.delivered_at && !previous.deliveredAt) {
            patch.delivered_at = new Date().toISOString();
        }
    }
    return patch;
}

// Return allowed next statuses for UI dropdowns and validation hints.
export function listAllowedTransitions(fromRaw) {
    const from = normalizeDeliveryStatus(fromRaw) || PENDING;
    return ALLOWED[from] ? [...ALLOWED[from]] : [...DELIVERY_STATUS_VALUES_SAFE()];
}

// Read delivery status values safely without exposing mutable arrays.
function DELIVERY_STATUS_VALUES_SAFE() {
    return Object.values(DELIVERY_STATUS);
}
