/**
 * Lightweight cache of shop region_mode for sync validators (Zod).
 * Refreshed whenever settings are read or updated.
 */
import { normalizeRegionMode } from './regionPresets.js';

let cachedRegionMode = 'us';

export function getCachedRegionMode() {
    return cachedRegionMode;
}

export function setCachedRegionMode(mode) {
    cachedRegionMode = normalizeRegionMode(mode);
}
