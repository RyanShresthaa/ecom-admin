/**
 * Default + normalize customer notification / privacy preferences.
 */
export const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
    orderUpdates: true,
    marketingEmails: false,
    reviewRequests: false,
    publicProfile: false,
    smsNotifications: false,
    pushNotifications: false,
    shareWishlist: false,
});

export function normalizeNotificationPrefs(raw) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const bool = (key, fallback) =>
        typeof src[key] === 'boolean' ? src[key] : fallback;

    return {
        orderUpdates: bool('orderUpdates', DEFAULT_NOTIFICATION_PREFS.orderUpdates),
        marketingEmails: bool('marketingEmails', DEFAULT_NOTIFICATION_PREFS.marketingEmails),
        reviewRequests: bool('reviewRequests', DEFAULT_NOTIFICATION_PREFS.reviewRequests),
        publicProfile: bool('publicProfile', DEFAULT_NOTIFICATION_PREFS.publicProfile),
        smsNotifications: bool('smsNotifications', DEFAULT_NOTIFICATION_PREFS.smsNotifications),
        pushNotifications: bool('pushNotifications', DEFAULT_NOTIFICATION_PREFS.pushNotifications),
        shareWishlist: bool('shareWishlist', DEFAULT_NOTIFICATION_PREFS.shareWishlist),
    };
}

function prefsOf(userOrPrefs) {
    return normalizeNotificationPrefs(
        userOrPrefs?.notification_prefs ??
            userOrPrefs?.notificationPrefs ??
            userOrPrefs,
    );
}

export function wantsOrderEmails(userOrPrefs) {
    return prefsOf(userOrPrefs).orderUpdates !== false;
}

export function wantsSms(userOrPrefs) {
    return prefsOf(userOrPrefs).smsNotifications === true;
}

export function wantsPush(userOrPrefs) {
    return prefsOf(userOrPrefs).pushNotifications === true;
}

export function isPublicProfileEnabled(userOrPrefs) {
    return prefsOf(userOrPrefs).publicProfile === true;
}

export function wantsShareWishlist(userOrPrefs) {
    return prefsOf(userOrPrefs).shareWishlist === true;
}
