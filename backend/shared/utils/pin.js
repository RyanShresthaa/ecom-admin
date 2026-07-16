/**
 * Mobile PIN rules: 4–6 digits by default (override with MOBILE_PIN_MIN / MOBILE_PIN_MAX, max 8).
 */
const MIN = Math.min(8, Math.max(4, Number(process.env.MOBILE_PIN_MIN || 4)));
const MAX = Math.min(8, Math.max(MIN, Number(process.env.MOBILE_PIN_MAX || 6)));

// Expose allowed PIN length boundaries for account security checks.
export function getPinLengthBounds() {
    return { min: MIN, max: MAX };
}

/** @returns {string | null} error message or null if OK */
// Validate PIN format and length before secure operations.
export function validatePinFormat(pin) {
    if (pin == null || typeof pin !== 'string') {
        return 'PIN is required';
    }
    const trimmed = pin.trim();
    if (!/^\d+$/.test(trimmed)) {
        return 'PIN must contain only digits';
    }
    if (trimmed.length < MIN || trimmed.length > MAX) {
        return `PIN must be between ${MIN} and ${MAX} digits`;
    }
    return null;
}
