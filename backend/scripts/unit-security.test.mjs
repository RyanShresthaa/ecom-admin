/**
 * Unit tests (no server required). Run: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import generateOtp from '../shared/utils/generateOtp.js';
import { validatePasswordStrength } from '../shared/utils/password.js';
import { isMockPaymentAllowed, MOCK_PAYMENT_DISABLED_MSG } from '../shared/config/payments.js';

describe('generateOtp', () => {
    it('returns a 6-digit string', () => {
        const otp = generateOtp();
        assert.equal(String(otp).length, 6);
        assert.match(String(otp), /^[0-9]{6}$/);
    });
});

describe('validatePasswordStrength', () => {
    it('rejects short passwords', () => {
        assert.ok(validatePasswordStrength('Ab1'));
    });
    it('rejects missing uppercase', () => {
        assert.match(validatePasswordStrength('abcdefgh1'), /uppercase/i);
    });
    it('accepts strong passwords', () => {
        assert.equal(validatePasswordStrength('SecurePass1'), null);
    });
});

describe('isMockPaymentAllowed', () => {
    it('returns a message when disabled', () => {
        assert.ok(MOCK_PAYMENT_DISABLED_MSG.length > 10);
    });
});
