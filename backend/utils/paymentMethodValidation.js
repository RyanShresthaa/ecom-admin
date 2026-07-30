/**
 * Verify customer payment / bank details before save.
 * Never store full PAN, CVV, or full bank account numbers — only verified metadata + last4.
 */

function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function collapse(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/** Luhn checksum — rejects typed / fake card numbers. */
export function luhnValid(pan) {
    const digits = digitsOnly(pan);
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let n = Number(digits[i]);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}

export function detectCardBrand(pan) {
    const d = digitsOnly(pan);
    if (/^4\d{12,18}$/.test(d)) return 'visa';
    if (/^5[1-5]\d{14}$/.test(d) || /^2(2[2-9]|[3-6]\d|7[01]|720)\d{12}$/.test(d)) return 'mastercard';
    if (/^3[47]\d{13}$/.test(d)) return 'amex';
    if (/^6(?:011|5\d{2})\d{12}$/.test(d) || /^64[4-9]\d{13}$/.test(d)) return 'discover';
    if (/^3(?:0[0-5]|[68]\d)\d{11}$/.test(d)) return 'diners';
    if (/^(?:2131|1800|35\d{3})\d{11}$/.test(d)) return 'jcb';
    return 'card';
}

/**
 * US ABA routing number — 9 digits with official checksum.
 * https://en.wikipedia.org/wiki/ABA_routing_transit_number
 */
export function abaRoutingValid(routing) {
    const d = digitsOnly(routing);
    if (!/^\d{9}$/.test(d)) return false;
    const n = d.split('').map(Number);
    const checksum =
        3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8]);
    return checksum % 10 === 0;
}

function parseExpiry(expiryDate, expMonth, expYear) {
    let month = Number(expMonth);
    let year = Number(expYear);
    if ((!month || !year) && expiryDate) {
        const m = String(expiryDate).trim().match(/^(\d{1,2})\s*[\/\-]\s*(\d{2}|\d{4})$/);
        if (m) {
            month = Number(m[1]);
            year = Number(m[2]);
            if (year < 100) year += 2000;
        }
    }
    if (year > 0 && year < 100) year += 2000;
    return { month, year };
}

/**
 * Validate card details (format + Luhn + expiry). Does not charge or talk to a bank.
 * @returns {{ ok: true, value: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateCardDetails(input = {}) {
    const errors = {};
    const pan = digitsOnly(input.cardNumber ?? input.number ?? input.pan);
    const cvv = digitsOnly(input.cvv ?? input.cvc);
    const holder = collapse(input.cardholderName ?? input.name ?? input.billing_name);
    const billingZip = collapse(input.billingZip ?? input.billing_zip ?? input.pincode ?? input.zip);
    const { month, year } = parseExpiry(input.expiryDate ?? input.expiry, input.expMonth, input.expYear);

    if (!luhnValid(pan)) {
        errors.cardNumber = 'Enter a valid card number.';
    } else if (/^(\d)\1+$/.test(pan)) {
        errors.cardNumber = 'Card number looks invalid.';
    }

    const brand = pan ? detectCardBrand(pan) : 'card';
    const cvvLen = brand === 'amex' ? 4 : 3;
    if (cvv.length !== cvvLen) {
        errors.cvv = brand === 'amex' ? 'Enter the 4-digit CVV.' : 'Enter the 3-digit CVV.';
    }

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    if (!month || month < 1 || month > 12) {
        errors.expiryDate = 'Enter a valid expiry month (MM/YY).';
    } else if (!year || year < curY || year > curY + 25) {
        errors.expiryDate = 'Enter a valid expiry year.';
    } else if (year === curY && month < curM) {
        errors.expiryDate = 'This card appears to be expired.';
    }

    if (holder.length < 2 || !/[a-zA-Z]/.test(holder)) {
        errors.cardholderName = 'Enter the name on the card.';
    }

    if (billingZip && !/^\d{5}(-\d{4})?$/.test(billingZip) && !/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(billingZip)) {
        errors.billingZip = 'Enter a valid billing ZIP / postal code.';
    }

    if (Object.keys(errors).length) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            type: 'card',
            brand,
            last4: pan.slice(-4),
            exp_month: month,
            exp_year: year,
            billing_name: holder,
            billing_zip: billingZip || null,
            // Never return full PAN / CVV
        },
    };
}

/**
 * Validate US bank account (ACH) routing + account format.
 * @returns {{ ok: true, value: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateBankDetails(input = {}) {
    const errors = {};
    const routing = digitsOnly(input.routingNumber ?? input.routing);
    const account = digitsOnly(input.accountNumber ?? input.account);
    const accountConfirm = digitsOnly(input.accountNumberConfirm ?? input.confirmAccount);
    const holder = collapse(input.accountHolderName ?? input.name ?? input.billing_name);
    const bankName = collapse(input.bankName ?? input.bank_name);
    const accountType = String(input.accountType ?? input.account_type ?? 'checking')
        .trim()
        .toLowerCase();

    if (!abaRoutingValid(routing)) {
        errors.routingNumber = 'Enter a valid 9-digit US bank routing number.';
    }

    if (account.length < 4 || account.length > 17) {
        errors.accountNumber = 'Enter a valid bank account number (4–17 digits).';
    } else if (/^(\d)\1+$/.test(account)) {
        errors.accountNumber = 'Account number looks invalid.';
    }

    if (accountConfirm && accountConfirm !== account) {
        errors.accountNumberConfirm = 'Account numbers do not match.';
    }

    if (holder.length < 2 || !/[a-zA-Z]/.test(holder)) {
        errors.accountHolderName = 'Enter the account holder name.';
    }

    if (accountType && !['checking', 'savings'].includes(accountType)) {
        errors.accountType = 'Account type must be checking or savings.';
    }

    if (Object.keys(errors).length) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            type: 'bank',
            brand: 'ach',
            last4: account.slice(-4),
            bank_name: bankName || null,
            account_type: accountType || 'checking',
            billing_name: holder,
            routing_last4: routing.slice(-4),
            // Never return full account / routing
        },
    };
}

/**
 * Dispatch card vs bank verification from a combined body.
 */
export function validatePaymentMethodDetails(input = {}) {
    const kind = String(input.type || input.methodType || '').toLowerCase();
    if (kind === 'bank' || kind === 'ach' || input.routingNumber || input.routing) {
        return validateBankDetails(input);
    }
    return validateCardDetails(input);
}

export function firstPaymentError(result) {
    if (result.ok) return '';
    return Object.values(result.errors)[0] || 'Invalid payment details';
}
