// Catalog service exports variant and stock-sync helpers.
/**
 * Catalog domain services — public API (Phase 2).
 *
 *   variants.js  — attach / replace variants + sync parent stock
 */
// Export variant attachment and persistence APIs for catalog endpoints.
export {
    withVariants,
    withVariantsMany,
    syncProductStockFromVariants,
    saveProductVariants,
} from './variants.js';
