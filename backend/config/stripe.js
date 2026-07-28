/**
 * Lazy Stripe SDK instance from STRIPE_SECRET_KEY; null if unset or package missing (mock pay path).
 */
let Stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    try {
        const { default: StripeSdk } = await import('stripe');
        Stripe = new StripeSdk(process.env.STRIPE_SECRET_KEY);
    } catch {
        console.warn('Stripe package not installed; online pay uses mock mode.');
    }
}
export default Stripe;
