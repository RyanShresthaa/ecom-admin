/**
 * Mock payment allowed in non-production or when ALLOW_MOCK_PAYMENT=true (blocked otherwise).
 */
export function isMockPaymentAllowed() {
    if (process.env.ALLOW_MOCK_PAYMENT === 'true') return true;
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
}

export const MOCK_PAYMENT_DISABLED_MSG =
    'Online payment is not configured. Use COD or configure STRIPE_SECRET_KEY.';
