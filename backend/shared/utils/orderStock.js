// Order stock facade — re-exports warehouse-aware decrement/restore from inventoryStock.
/**
 * Stock decrement/restore — delegates to multi-warehouse `inventoryStock.js` (FOR UPDATE + ledger).
 */
export { decrementStock, restoreStock } from './inventoryStock.js';
