/**
 * Payment providers.
 *
 * Phase 1: only `manual` (offline) refunds run.
 * Stripe is exported as a stub — implement when STRIPE_SECRET_KEY is purchased.
 * eSewa / Khalti intentionally omitted.
 */
import { createManualRefund } from './manual.js';
import { createStripeRefund } from './stripe.js';
import { REFUND_PROVIDER } from '../constants.js';

/**
 * Resolve which provider handles gateway money movement.
 * @param {'manual'|'stripe'} [name]
 */
export function getRefundProvider(name = REFUND_PROVIDER.MANUAL) {
    // Normalize provider key so callers can pass mixed-case values.
    const key = String(name || REFUND_PROVIDER.MANUAL).toLowerCase();
    // Route to Stripe provider when explicitly requested.
    if (key === REFUND_PROVIDER.STRIPE) return { name: REFUND_PROVIDER.STRIPE, createRefund: createStripeRefund };
    // Default to manual provider for COD/offline refund handling.
    return { name: REFUND_PROVIDER.MANUAL, createRefund: createManualRefund };
}
