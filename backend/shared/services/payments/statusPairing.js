/**
 * Keep delivery_status and payment_status in sync for return/refund workflows.
 * Normalizes delivery casing via the fulfillment FSM helpers.
 */
import { PAYMENT_STATUS } from './constants.js';
import { DELIVERY_STATUS } from '../fulfillment/constants.js';
import { normalizeDeliveryStatus } from '../fulfillment/statusTransitions.js';

// Detect cancellation delivery statuses with loose legacy casing.
export const isCancelledStatus = (s) => /^cancel/i.test(String(s || ''));
// Detect fully returned delivery statuses.
export const isReturnedStatus = (s) => /^returned$/i.test(String(s || ''));
// Detect fully refunded payment statuses.
export const isRefundedStatus = (s) => /^refunded$/i.test(String(s || ''));
// Detect partial refund payment statuses.
export const isPartialRefundStatus = (s) => /partially\s*refunded/i.test(String(s || ''));
// Treat delivery/payment as return-like when either side is in terminal return/refund state.
export const isReturnLikeState = (delivery, payment) =>
    isReturnedStatus(delivery) || isRefundedStatus(payment) || isCancelledStatus(delivery);

/**
 * @param {object} previous - existing order line
 * @param {{ delivery_status?: string|null, payment_status?: string|null }} patch
 */
export function resolvePairedStatuses(previous, { delivery_status, payment_status }) {
    // Start from canonical previous values before applying incoming patch fields.
    const prevDelivery =
        normalizeDeliveryStatus(previous?.delivery_status || previous?.deliveryStatus) ||
        previous?.delivery_status ||
        previous?.deliveryStatus ||
        '';
    const prevPayment = previous?.payment_status || previous?.paymentStatus || '';

    let nextDelivery =
        delivery_status != null
            ? normalizeDeliveryStatus(delivery_status) || delivery_status
            : prevDelivery;
    let nextPayment = payment_status != null ? payment_status : prevPayment;

    // Returned ↔ Refunded
    // Force Returned <-> Refunded parity when either side is explicitly set.
    if (delivery_status != null && isReturnedStatus(nextDelivery) && !isRefundedStatus(nextPayment)) {
        nextPayment = PAYMENT_STATUS.REFUNDED;
    }
    if (payment_status != null && isRefundedStatus(payment_status) && !isReturnedStatus(nextDelivery)) {
        nextDelivery = DELIVERY_STATUS.RETURNED;
    }

    // Leaving return/refund undoes the paired field when the other wasn't set explicitly
    // Remove paired state only when counterpart field was not explicitly patched.
    if (
        delivery_status != null &&
        !isReturnedStatus(nextDelivery) &&
        isReturnedStatus(prevDelivery) &&
        payment_status == null &&
        isRefundedStatus(nextPayment)
    ) {
        nextPayment = PAYMENT_STATUS.PAID;
    }
    if (
        payment_status != null &&
        !isRefundedStatus(payment_status) &&
        isRefundedStatus(prevPayment) &&
        delivery_status == null &&
        isReturnedStatus(nextDelivery)
    ) {
        nextDelivery = DELIVERY_STATUS.DELIVERED;
    }

    return { nextDelivery, nextPayment, prevDelivery, prevPayment };
}
