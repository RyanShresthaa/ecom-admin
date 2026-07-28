/**
 * USA shipping address validation — reject empty/junk placeholders.
 * Business ships in the US; Nepali crafts are the products, not the tax region.
 */

const US_STATE_CODES = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
    'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const US_STATE_NAMES = new Map([
    ['alabama', 'AL'], ['alaska', 'AK'], ['arizona', 'AZ'], ['arkansas', 'AR'], ['california', 'CA'],
    ['colorado', 'CO'], ['connecticut', 'CT'], ['delaware', 'DE'], ['florida', 'FL'], ['georgia', 'GA'],
    ['hawaii', 'HI'], ['idaho', 'ID'], ['illinois', 'IL'], ['indiana', 'IN'], ['iowa', 'IA'],
    ['kansas', 'KS'], ['kentucky', 'KY'], ['louisiana', 'LA'], ['maine', 'ME'], ['maryland', 'MD'],
    ['massachusetts', 'MA'], ['michigan', 'MI'], ['minnesota', 'MN'], ['mississippi', 'MS'],
    ['missouri', 'MO'], ['montana', 'MT'], ['nebraska', 'NE'], ['nevada', 'NV'], ['new hampshire', 'NH'],
    ['new jersey', 'NJ'], ['new mexico', 'NM'], ['new york', 'NY'], ['north carolina', 'NC'],
    ['north dakota', 'ND'], ['ohio', 'OH'], ['oklahoma', 'OK'], ['oregon', 'OR'], ['pennsylvania', 'PA'],
    ['rhode island', 'RI'], ['south carolina', 'SC'], ['south dakota', 'SD'], ['tennessee', 'TN'],
    ['texas', 'TX'], ['utah', 'UT'], ['vermont', 'VT'], ['virginia', 'VA'], ['washington', 'WA'],
    ['west virginia', 'WV'], ['wisconsin', 'WI'], ['wyoming', 'WY'], ['district of columbia', 'DC'],
]);

const JUNK = new Set([
    'test', 'testing', 'asdf', 'asdfg', 'qwerty', 'abc', 'abcd', 'xxx', 'xxxx', 'aaa', 'bbb',
    'n/a', 'na', 'none', 'nil', 'null', 'undefined', 'foo', 'bar', 'baz', 'sample', 'fake',
    'dummy', 'placeholder', 'unknown', 'home', 'address', 'street', 'city', 'state', 'zip',
]);

function collapse(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function looksJunk(value) {
    const v = collapse(value).toLowerCase();
    if (!v) return true;
    if (JUNK.has(v)) return true;
    if (/^(.)\1{2,}$/.test(v.replace(/\s/g, ''))) return true; // aaa, 1111
    if (/^(test|asdf|qwer|xxx|abc|foo|bar)\b/i.test(v)) return true;
    return false;
}

function hasLetter(s) {
    return /[a-zA-Z]/.test(s);
}

export function normalizeUsPhone(mobile) {
    const digits = String(mobile || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
}

export function normalizeUsState(state) {
    const raw = collapse(state);
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (US_STATE_CODES.has(upper)) return upper;
    const code = US_STATE_NAMES.get(raw.toLowerCase());
    return code || raw;
}

export function normalizeUsCountry(country) {
    const c = collapse(country).toLowerCase();
    if (['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america'].includes(c)) {
        return 'United States';
    }
    return collapse(country);
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateUsShippingAddress(input = {}) {
    const errors = {};
    const address_line = collapse(input.address_line ?? input.addressLine);
    const city = collapse(input.city);
    const stateRaw = collapse(input.state);
    const pincode = collapse(input.pincode ?? input.zip ?? input.postal_code).toUpperCase();
    const country = normalizeUsCountry(input.country);
    const mobileDigits = normalizeUsPhone(input.mobile ?? input.phone);
    const state = normalizeUsState(stateRaw);

    if (address_line.length < 5) {
        errors.address_line = 'Enter a full street address (e.g. 123 Main St).';
    } else if (looksJunk(address_line) || !hasLetter(address_line)) {
        errors.address_line = 'Street address looks invalid.';
    } else if (!/\d/.test(address_line) && !/^p\.?\s*o\.?\s*box\b/i.test(address_line)) {
        errors.address_line = 'Include a house number or PO Box.';
    }

    if (city.length < 2) {
        errors.city = 'Enter a city name.';
    } else if (looksJunk(city) || !hasLetter(city) || !/^[a-zA-Z\s.'-]+$/.test(city)) {
        errors.city = 'City name looks invalid.';
    }

    if (!state || !US_STATE_CODES.has(state)) {
        errors.state = 'Enter a valid US state (e.g. CA or California).';
    }

    if (!/^\d{5}(-\d{4})?$/.test(pincode)) {
        errors.pincode = 'Enter a valid US ZIP code (12345 or 12345-6789).';
    }

    if (country !== 'United States') {
        errors.country = 'We currently ship within the United States only.';
    }

    if (mobileDigits.length !== 10) {
        errors.mobile = 'Enter a valid 10-digit US phone number.';
    } else if (/^(\d)\1{9}$/.test(mobileDigits) || mobileDigits.startsWith('000') || mobileDigits.startsWith('555')) {
        // 555 is reserved for fiction in North American Numbering Plan for many cases
        if (mobileDigits.startsWith('555') && mobileDigits.slice(3, 5) === '01') {
            errors.mobile = 'Enter a real phone number, not a placeholder.';
        } else if (/^(\d)\1{9}$/.test(mobileDigits) || mobileDigits.startsWith('000')) {
            errors.mobile = 'Enter a real phone number.';
        }
    }

    if (Object.keys(errors).length) {
        return { ok: false, errors };
    }

    const formattedMobile = `(${mobileDigits.slice(0, 3)}) ${mobileDigits.slice(3, 6)}-${mobileDigits.slice(6)}`;

    return {
        ok: true,
        value: {
            address_line,
            city,
            state,
            pincode: pincode.length === 5 ? pincode : pincode,
            country: 'United States',
            mobile: formattedMobile,
        },
    };
}

export function firstAddressError(result) {
    if (result.ok) return '';
    return Object.values(result.errors)[0] || 'Invalid address';
}

/**
 * Nepal domestic shipping — district/city + phone (not US ZIP rules).
 */
export function validateNepalShippingAddress(input = {}) {
    const errors = {};
    const address_line = collapse(input.address_line ?? input.addressLine);
    const city = collapse(input.city);
    const state = collapse(input.state); // district / province
    const pincode = collapse(input.pincode ?? input.zip ?? input.postal_code);
    const countryRaw = collapse(input.country).toLowerCase();
    const mobileDigits = String(input.mobile ?? input.phone ?? '').replace(/\D/g, '');

    if (address_line.length < 5 || looksJunk(address_line) || !hasLetter(address_line)) {
        errors.address_line = 'Enter a full street address or landmark.';
    }
    if (city.length < 2 || looksJunk(city) || !hasLetter(city)) {
        errors.city = 'Enter a city or municipality.';
    }
    if (state.length < 2 || looksJunk(state)) {
        errors.state = 'Enter a district or province.';
    }
    if (pincode && !/^\d{4,6}$/.test(pincode)) {
        errors.pincode = 'Enter a valid postal code (4–6 digits), or leave blank.';
    }
    const nepalOk =
        !countryRaw ||
        ['np', 'npl', 'nepal', 'federal democratic republic of nepal'].includes(countryRaw);
    if (!nepalOk) {
        errors.country = 'Country must be Nepal for Nepal store mode.';
    }
    // Nepal mobiles: 10 digits starting with 9, or with country code 977
    let phone = mobileDigits;
    if (phone.startsWith('977') && phone.length >= 12) phone = phone.slice(3);
    if (phone.length !== 10 || !/^9\d{9}$/.test(phone)) {
        errors.mobile = 'Enter a valid 10-digit Nepal mobile number (starts with 9).';
    }

    if (Object.keys(errors).length) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            address_line,
            city,
            state,
            pincode: pincode || '',
            country: 'Nepal',
            mobile: phone,
        },
    };
}

/** Dispatch by store region mode (`us` | `nepal`). */
export function validateShippingAddress(input = {}, regionMode = 'us') {
    const mode = String(regionMode || 'us').toLowerCase();
    if (mode === 'nepal' || mode === 'np') {
        return validateNepalShippingAddress(input);
    }
    return validateUsShippingAddress(input);
}
