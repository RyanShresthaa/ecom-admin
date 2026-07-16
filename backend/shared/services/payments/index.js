// Payments service exports refund, status, and provider APIs.
/**
 * Payments domain services — public API.
 *
 * Folder layout:
 *   constants.js       status / provider enums
 *   statusPairing.js   Returned ↔ Refunded rules
 *   creditNote.js      CRN creation for refunds & returns
 *   refundService.js   full / partial refund orchestration
 *   providers/
 *     manual.js        Phase 1 offline refunds (active)
 *     stripe.js        stub — implement when Stripe keys are available
 *     index.js         provider resolver
 *
 * HTTP lives in customer/controllers (refund.controller, order.controller, return.controller).
 */
// Export payment/refund constants for shared status handling.
export * from './constants.js';
// Export delivery/payment pairing guards and resolvers.
export {
    resolvePairedStatuses,
    isCancelledStatus,
    isReturnedStatus,
    isRefundedStatus,
    isPartialRefundStatus,
    isReturnLikeState,
} from './statusPairing.js';
// Export credit note generators for return and refund flows.
export {
    ensureCreditNoteForApprovedReturn,
    createCreditNoteForOrderLine,
} from './creditNote.js';
// Export core refund orchestration and lookup helpers.
export {
    refundOrderLine,
    refundApprovedReturn,
    getRefundsForOrderRow,
    sumCompletedRefundsForOrderRow,
} from './refundService.js';
// Export provider resolver that selects manual vs stripe strategy.
export { getRefundProvider } from './providers/index.js';
