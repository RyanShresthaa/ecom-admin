/**
 * Stripe refund provider — STUB for later.
 *
 * Do not call createStripeRefund in production until:
 *   1. STRIPE_SECRET_KEY is set
 *   2. This file implements Stripe.refunds.create(...)
 *
 * Keeping the interface identical to `manual.js` so refundService can switch providers
 * without changing HTTP controllers.
 */
import { REFUND_PROVIDER } from '../constants.js';

/**
 * @param {{ amount: number, currency?: string, reason?: string, paymentId?: string }} _input
 */
export async function createStripeRefund(_input) {
    // Throw explicit stub error until Stripe API integration is implemented.
    const err = new Error(
        'Stripe refunds are not configured yet. Use provider "manual" or set up STRIPE_SECRET_KEY later.',
    );
    err.status = 501;
    err.code = 'STRIPE_REFUND_NOT_IMPLEMENTED';
    err.provider = REFUND_PROVIDER.STRIPE;
    throw err;
}
