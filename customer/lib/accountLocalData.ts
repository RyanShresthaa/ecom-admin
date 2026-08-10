/** Browser keys that must not leak across logout / account delete / new signup. */
export const ACCOUNT_LOCAL_KEYS = [
  'matina_cart',
  'matina_cart_promo',
  'matina_cart_owner',
  'matina_wishlist',
  'matina_wishlist_owner',
  'matina_pending_verify_email',
] as const;

/** Wipe device-local cart/wishlist so the next account starts clean. */
export function clearAccountLocalData() {
  if (typeof window === 'undefined') return;
  for (const key of ACCOUNT_LOCAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
