// Payment service constants shared by checkout, returns, and refunds.
/**
 * Payment / refund status constants shared across checkout + refund flows.
 */
export const PAYMENT_METHODS = Object.freeze({
    CASH: 'cash',
    STRIPE: 'stripe',
});

/** Values stored on orders.payment_status */
export const PAYMENT_STATUS = Object.freeze({
    CASH_ON_DELIVERY: 'CASH ON DELIVERY',
    PAID: 'PAID',
    UNPAID: 'Unpaid',
    PARTIALLY_REFUNDED: 'Partially Refunded',
    REFUNDED: 'Refunded',
});

/** Values stored on orders.delivery_status — re-export fulfillment lifecycle */
export { DELIVERY_STATUS } from '../fulfillment/constants.js';

/** Refund ledger providers — Stripe is stubbed until API keys are configured */
export const REFUND_PROVIDER = Object.freeze({
    MANUAL: 'manual',
    STRIPE: 'stripe',
});

export const REFUND_STATUS = Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
});
