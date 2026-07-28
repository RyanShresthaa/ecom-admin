/**
 * Mock online pay only when explicitly enabled.
 * Without STRIPE_SECRET_KEY, place-online returns 503 unless ALLOW_MOCK_PAYMENT=true.
 */
export function isMockPaymentAllowed() {
    return process.env.ALLOW_MOCK_PAYMENT === 'true';
}

export const MOCK_PAYMENT_DISABLED_MSG =
    'Online payment is not configured. Use Cash on Delivery, or set STRIPE_SECRET_KEY on the backend.';
