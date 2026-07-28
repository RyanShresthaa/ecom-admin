/**
 * Thin helpers for business KPI increments (never throw into request path).
 */
import {
    businessOrders,
    businessPayments,
    businessCheckout,
    businessUsers,
    businessUploads,
    businessNewsletter,
    businessCartAbandonments,
} from './metrics.js';

function safe(fn) {
    try {
        fn();
    } catch {
        /* metrics must not break requests */
    }
}

export const biz = {
    orderCreated: (channel = 'unknown') =>
        safe(() => businessOrders.inc({ outcome: 'created', channel })),
    orderFailed: (channel = 'unknown') =>
        safe(() => businessOrders.inc({ outcome: 'failed', channel })),
    paymentSucceeded: (provider = 'unknown') =>
        safe(() => businessPayments.inc({ outcome: 'succeeded', provider })),
    paymentFailed: (provider = 'unknown') =>
        safe(() => businessPayments.inc({ outcome: 'failed', provider })),
    checkoutStarted: () => safe(() => businessCheckout.inc({ step: 'started' })),
    checkoutCompleted: () => safe(() => businessCheckout.inc({ step: 'completed' })),
    /** Checkout funnel failures / cancel before payment (server-side signal). */
    checkoutAbandoned: () => safe(() => businessCheckout.inc({ step: 'abandoned_signal' })),
    /** First-class client abandon (cancel page, leave checkout, clear cart). */
    cartAbandoned: (reason = 'client') =>
        safe(() => {
            businessCheckout.inc({ step: 'abandoned' });
            businessCartAbandonments.inc({ reason: String(reason || 'client').slice(0, 40) });
        }),
    preview: () => safe(() => businessCheckout.inc({ step: 'preview' })),
    userRegistered: () => safe(() => businessUsers.inc({ event: 'registered' })),
    loginSuccess: () => safe(() => businessUsers.inc({ event: 'login_success' })),
    loginFailed: () => safe(() => businessUsers.inc({ event: 'login_failed' })),
    googleLogin: () => safe(() => businessUsers.inc({ event: 'google_login' })),
    passwordReset: () => safe(() => businessUsers.inc({ event: 'password_reset' })),
    emailVerified: () => safe(() => businessUsers.inc({ event: 'email_verified' })),
    uploadOk: () => safe(() => businessUploads.inc({ outcome: 'success' })),
    uploadFail: () => safe(() => businessUploads.inc({ outcome: 'failure' })),
    newsletterOk: () => safe(() => businessNewsletter.inc({ outcome: 'success' })),
    newsletterFail: () => safe(() => businessNewsletter.inc({ outcome: 'failure' })),
};
