/**
 * USA shipping + contact validation for the storefront (mirrors backend rules).
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
  'n/a', 'na', 'none', 'nil', 'null', 'foo', 'bar', 'baz', 'sample', 'fake', 'dummy',
  'placeholder', 'unknown', 'home', 'address', 'street', 'city', 'state', 'zip',
]);

function collapse(s: unknown) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function looksJunk(value: string) {
  const v = collapse(value).toLowerCase();
  if (!v) return true;
  if (JUNK.has(v)) return true;
  if (/^(.)\1{2,}$/.test(v.replace(/\s/g, ''))) return true;
  if (/^(test|asdf|qwer|xxx|abc|foo|bar)\b/i.test(v)) return true;
  return false;
}

export function normalizeUsPhone(mobile: string) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

export function normalizeUsState(state: string) {
  const raw = collapse(state);
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (US_STATE_CODES.has(upper)) return upper;
  return US_STATE_NAMES.get(raw.toLowerCase()) || raw;
}

export function normalizeUsCountry(country: string) {
  const c = collapse(country).toLowerCase();
  if (
    ['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america'].includes(
      c,
    )
  ) {
    return 'United States';
  }
  return collapse(country);
}

export type ShippingAddressInput = {
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  mobile: string;
};

export type AddressValidationResult =
  | { ok: true; value: ShippingAddressInput }
  | { ok: false; errors: Partial<Record<keyof ShippingAddressInput, string>> };

export function validateUsShippingAddress(input: Partial<ShippingAddressInput>): AddressValidationResult {
  const errors: Partial<Record<keyof ShippingAddressInput, string>> = {};
  const address_line = collapse(input.address_line);
  const city = collapse(input.city);
  const pincode = collapse(input.pincode).toUpperCase();
  const country = normalizeUsCountry(input.country || '');
  const mobileDigits = normalizeUsPhone(input.mobile || '');
  const state = normalizeUsState(input.state || '');

  if (address_line.length < 5) {
    errors.address_line = 'Enter a full street address (e.g. 123 Main St).';
  } else if (looksJunk(address_line) || !/[a-zA-Z]/.test(address_line)) {
    errors.address_line = 'Street address looks invalid.';
  } else if (!/\d/.test(address_line) && !/^p\.?\s*o\.?\s*box\b/i.test(address_line)) {
    errors.address_line = 'Include a house number or PO Box.';
  }

  if (city.length < 2) {
    errors.city = 'Enter a city name.';
  } else if (looksJunk(city) || !/^[a-zA-Z\s.'-]+$/.test(city)) {
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
  } else if (/^(\d)\1{9}$/.test(mobileDigits) || mobileDigits.startsWith('000')) {
    errors.mobile = 'Enter a real phone number.';
  } else if (mobileDigits.startsWith('555') && mobileDigits.slice(3, 5) === '01') {
    errors.mobile = 'Enter a real phone number, not a placeholder.';
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
      pincode,
      country: 'United States',
      mobile: `(${mobileDigits.slice(0, 3)}) ${mobileDigits.slice(3, 6)}-${mobileDigits.slice(6)}`,
    },
  };
}

export function validateNepalShippingAddress(input: ShippingAddressInput) {
  const errors: Record<string, string> = {};
  const address_line = collapse(input.address_line);
  const city = collapse(input.city);
  const state = collapse(input.state);
  const pincode = collapse(input.pincode);
  const countryRaw = collapse(input.country).toLowerCase();
  let phone = String(input.mobile || '').replace(/\D/g, '');
  if (phone.startsWith('977') && phone.length >= 12) phone = phone.slice(3);

  if (address_line.length < 5 || looksJunk(address_line)) {
    errors.address_line = 'Enter a full street address or landmark.';
  }
  if (city.length < 2 || looksJunk(city)) {
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
  if (phone.length !== 10 || !/^9\d{9}$/.test(phone)) {
    errors.mobile = 'Enter a valid 10-digit Nepal mobile number (starts with 9).';
  }

  if (Object.keys(errors).length) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
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

export function validateShippingAddress(
  input: ShippingAddressInput,
  regionMode: 'us' | 'nepal' = 'us',
) {
  if (regionMode === 'nepal') return validateNepalShippingAddress(input);
  return validateUsShippingAddress(input);
}

export function validateContactForm(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  message: string;
}) {
  const errors: Record<string, string> = {};
  const name = collapse(input.name);
  const email = collapse(input.email).toLowerCase();
  const phoneDigits = normalizeUsPhone(input.phone);
  const address = collapse(input.address);
  const message = collapse(input.message);

  if (name.length < 2 || looksJunk(name) || !/^[a-zA-Z\s.'-]+$/.test(name)) {
    errors.name = 'Enter your real full name.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || looksJunk(email.split('@')[0] || '')) {
    errors.email = 'Enter a valid email address.';
  }
  if (phoneDigits.length !== 10) {
    errors.phone = 'Enter a valid 10-digit US phone number.';
  }
  if (address.length < 5 || looksJunk(address)) {
    errors.address = 'Enter a real mailing or street address.';
  }
  if (message.length < 10 || looksJunk(message)) {
    errors.message = 'Please write a short message (at least 10 characters).';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, email, phone: phoneDigits, address, message },
  };
}

export function firstError(errors: Record<string, string | undefined>) {
  return Object.values(errors).find(Boolean) || '';
}
