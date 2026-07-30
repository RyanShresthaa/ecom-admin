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
 * Approximate US ZIP3 → state (USPS ranges). Used to catch mismatched city/state/ZIP.
 * Not a full postal database — rejects obvious ZIP/state mismatches.
 */
const ZIP3_STATE = (() => {
    /** @type {Map<number, string>} */
    const map = new Map();
    const add = (state, ranges) => {
        for (const [lo, hi] of ranges) {
            for (let z = lo; z <= hi; z += 1) map.set(z, state);
        }
    };
    add('AL', [[350, 369]]);
    add('AK', [[995, 999]]);
    add('AZ', [[850, 865]]);
    add('AR', [[716, 729]]);
    add('CA', [[900, 961]]);
    add('CO', [[800, 816]]);
    add('CT', [[60, 69]]);
    add('DE', [[197, 199]]);
    add('DC', [[200, 205]]);
    add('FL', [[320, 349]]);
    add('GA', [[300, 319], [398, 399]]);
    add('HI', [[967, 968]]);
    add('ID', [[832, 838]]);
    add('IL', [[600, 629]]);
    add('IN', [[460, 479]]);
    add('IA', [[500, 528]]);
    add('KS', [[660, 679]]);
    add('KY', [[400, 427]]);
    add('LA', [[700, 715]]);
    add('ME', [[39, 49]]);
    add('MD', [[206, 219]]);
    add('MA', [[10, 27], [55, 55]]);
    add('MI', [[480, 499]]);
    add('MN', [[550, 567]]);
    add('MS', [[386, 397]]);
    add('MO', [[630, 658]]);
    add('MT', [[590, 599]]);
    add('NE', [[680, 693]]);
    add('NV', [[889, 898]]);
    add('NH', [[30, 38]]);
    add('NJ', [[70, 89]]);
    add('NM', [[870, 884]]);
    add('NY', [[100, 149], [5, 5], [63, 63]]);
    add('NC', [[270, 289]]);
    add('ND', [[580, 588]]);
    add('OH', [[430, 459]]);
    add('OK', [[730, 749]]);
    add('OR', [[970, 979]]);
    add('PA', [[150, 196]]);
    add('RI', [[28, 29]]);
    add('SC', [[290, 299]]);
    add('SD', [[570, 577]]);
    add('TN', [[370, 385]]);
    add('TX', [[750, 799], [885, 885]]);
    add('UT', [[840, 847]]);
    add('VT', [[50, 59]]);
    add('VA', [[201, 201], [220, 246]]);
    add('WA', [[980, 994]]);
    add('WV', [[247, 268]]);
    add('WI', [[530, 549]]);
    add('WY', [[820, 831]]);
    return map;
})();

export function lookupUsStateByZip(zip) {
    const digits = String(zip || '').replace(/\D/g, '');
    if (digits.length < 3) return null;
    const zip3 = Number(digits.slice(0, 3));
    return ZIP3_STATE.get(zip3) || null;
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
    } else if (state && US_STATE_CODES.has(state)) {
        const zipState = lookupUsStateByZip(pincode);
        if (zipState && zipState !== state) {
            errors.pincode = `ZIP ${pincode.slice(0, 5)} does not match ${state} (expected ${zipState}).`;
            errors.state = `State does not match ZIP ${pincode.slice(0, 5)}.`;
        }
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
