/**
 * Mock payment allowed in non-production or when ALLOW_MOCK_PAYMENT=true (blocked otherwise).
 *
 * Phase 1 notes:
 * - Stripe Checkout / refunds are intentionally not required yet.
 * - Staff refunds use provider "manual" (see shared/services/payments/).
 * - When you add STRIPE_SECRET_KEY later, implement providers/stripe.js refunds + webhooks.
 */
// Allow mock payment mode for local/dev or explicitly enabled deployments.
export function isMockPaymentAllowed() {
    if (process.env.ALLOW_MOCK_PAYMENT === 'true') return true;
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
}

// User-facing fallback message when online payment provider is disabled.
export const MOCK_PAYMENT_DISABLED_MSG =
    'Online payment is not configured. Use cash/COD, or configure STRIPE_SECRET_KEY later.';
