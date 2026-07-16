/**
 * Password policy (length, mixed case, digit); PASSWORD_MIN_LENGTH overrides default 8.
 */
const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 8);

// Validate password strength rules for authentication security.
export function validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
        return 'Password is required';
    }
    if (password.length < MIN_LENGTH) {
        return `Password must be at least ${MIN_LENGTH} characters`;
    }
    if (password.length > 128) {
        return 'Password is too long';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must include a lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must include an uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must include a number';
    }
    return null;
}
