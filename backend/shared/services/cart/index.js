// Cart service exports guest merge and validation helpers.
/**
 * Cart domain helpers — guest merge + validation (Phase 4).
 */
// Export guest cart merge APIs used during login.
export { mergeGuestCartIntoUser, tryMergeGuestCartOnLogin } from './mergeGuestCart.js';
// Export cart integrity/cleanup APIs used before checkout.
export { validateCart, purgeExpiredCarts } from './validateCart.js';
