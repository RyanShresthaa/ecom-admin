// Fulfillment service exports delivery lifecycle and shipping helpers.
/**
 * Fulfillment domain — Phase 3.
 *
 *   constants.js          delivery lifecycle + carriers
 *   statusTransitions.js  FSM normalize / validate / timestamps
 *   shippingRates.js      zone-based shipping resolution
 *   tracking.js           tracking_number + carrier on order group
 *   reorder.js            buy-again → cart
 */
// Export shared delivery status constants and carrier list.
export { DELIVERY_STATUS, DELIVERY_STATUS_LIST, CARRIERS } from './constants.js';
// Export status FSM functions used by order update flows.
export {
    normalizeDeliveryStatus,
    assertDeliveryTransition,
    fulfillmentTimestamps,
    listAllowedTransitions,
    isTerminalDelivery,
} from './statusTransitions.js';
// Export zone and fallback shipping rate resolution.
export { resolveShippingRate, matchShippingRate } from './shippingRates.js';
// Export shipment tracking assignment helper.
export { applyTracking } from './tracking.js';
// Export reorder helper to copy past order lines to cart.
export { reorderToCart } from './reorder.js';
