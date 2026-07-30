/**
 * Shared storefront field sanitizers + validators.
 * Use onChange sanitizers to block junk characters; validate on blur/submit.
 */

const JUNK = new Set([
  'test',
  'testing',
  'asdf',
  'asdfg',
  'qwerty',
  'abc',
  'abcd',
  'xxx',
  'xxxx',
  'aaa',
  'bbb',
  'n/a',
  'na',
  'none',
  'nil',
  'null',
  'foo',
  'bar',
  'baz',
  'sample',
  'fake',
  'dummy',
  'placeholder',
  'unknown',
]);

export function collapseWhitespace(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function looksJunk(value: string): boolean {
  const v = collapseWhitespace(value).toLowerCase();
  if (!v) return true;
  if (JUNK.has(v)) return true;
  if (/^(.)\1{2,}$/.test(v.replace(/\s/g, ''))) return true;
  if (/^(test|asdf|qwer|xxx|abc|foo|bar)\b/i.test(v)) return true;
  return false;
}

export function firstFieldError(errors: Record<string, string | undefined>): string {
  return Object.values(errors).find(Boolean) || '';
}

// ─── Name ───────────────────────────────────────────────────

/** Allow letters, spaces, apostrophes, periods, hyphens only. */
export function sanitizeNameInput(raw: string, max = 80): string {
  return String(raw || '')
    .replace(/[^\p{L}\s.'-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max);
}

export function validateName(raw: string): string | null {
  const name = collapseWhitespace(raw);
  if (name.length < 2) return 'Enter your full name (at least 2 characters).';
  if (name.length > 80) return 'Name is too long.';
  if (looksJunk(name) || !/^[\p{L}\s.'-]+$/u.test(name)) return 'Enter a real name using letters only.';
  if (!/\p{L}/u.test(name)) return 'Enter a real name.';
  return null;
}

// ─── Email ──────────────────────────────────────────────────

export function sanitizeEmailInput(raw: string, max = 320): string {
  return String(raw || '')
    .replace(/\s/g, '')
    .slice(0, max)
    .toLowerCase();
}

export function validateEmail(raw: string): string | null {
  const email = sanitizeEmailInput(raw);
  if (!email) return 'Enter your email address.';
  if (email.length > 320) return 'Email is too long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Enter a valid email address.';
  const local = email.split('@')[0] || '';
  if (looksJunk(local)) return 'Enter a real email address.';
  return null;
}

// ─── Phone (US-focused storefront) ──────────────────────────

export function digitsOnly(raw: string, max = 15): string {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, max);
}

export function normalizeUsPhoneDigits(raw: string): string {
  const digits = digitsOnly(raw, 15);
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(0, 10);
}

/** Format as (415) 555-2671 while typing. */
export function formatUsPhoneInput(raw: string): string {
  const d = normalizeUsPhoneDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

export function validateUsPhone(raw: string): string | null {
  const digits = normalizeUsPhoneDigits(raw);
  if (digits.length !== 10) return 'Enter a valid 10-digit US phone number.';
  if (/^(\d)\1{9}$/.test(digits) || digits.startsWith('000')) return 'Enter a real phone number.';
  if (digits.startsWith('555') && digits.slice(3, 5) === '01') {
    return 'Enter a real phone number, not a placeholder.';
  }
  return null;
}

// ─── Password ───────────────────────────────────────────────

export function sanitizePasswordInput(raw: string, max = 128): string {
  // Allow typing freely but block control chars / truncate
  return String(raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, max);
}

export function validatePassword(raw: string, opts?: { required?: boolean }): string | null {
  const password = String(raw || '');
  if (!password) {
    return opts?.required === false ? null : 'Enter your password.';
  }
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number.';
  }
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

// ─── Free text / address / message ──────────────────────────

export function sanitizeSingleLine(raw: string, max = 200): string {
  return String(raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max);
}

export function sanitizeMultiline(raw: string, max = 2000): string {
  return String(raw || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, max);
}

export function validateStreetAddress(raw: string): string | null {
  const address = collapseWhitespace(raw);
  if (address.length < 5) return 'Enter a real mailing or street address.';
  if (address.length > 200) return 'Address is too long.';
  if (looksJunk(address)) return 'Address looks invalid.';
  return null;
}

export function validateMessage(raw: string, opts?: { min?: number; max?: number }): string | null {
  const min = opts?.min ?? 10;
  const max = opts?.max ?? 2000;
  const message = collapseWhitespace(raw);
  if (message.length < min) return `Please write a short message (at least ${min} characters).`;
  if (message.length > max) return `Message is too long (max ${max} characters).`;
  if (looksJunk(message)) return 'Please write a real message.';
  return null;
}

export function validateOtpCode(raw: string, length = 6): string | null {
  const code = digitsOnly(raw, length);
  if (code.length !== length) return `Enter the ${length}-digit code.`;
  return null;
}

// ─── Contact form (compose) ─────────────────────────────────

export type ContactFormInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  message: string;
};

export function validateContactForm(input: ContactFormInput): {
  ok: boolean;
  errors: Partial<Record<keyof ContactFormInput, string>>;
  value: ContactFormInput;
} {
  const name = collapseWhitespace(input.name);
  const email = sanitizeEmailInput(input.email);
  const phoneDigits = normalizeUsPhoneDigits(input.phone);
  const address = collapseWhitespace(input.address);
  const message = collapseWhitespace(input.message);

  const errors: Partial<Record<keyof ContactFormInput, string>> = {};
  const nameErr = validateName(name);
  const emailErr = validateEmail(email);
  const phoneErr = validateUsPhone(phoneDigits);
  const addressErr = validateStreetAddress(address);
  const messageErr = validateMessage(message);

  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (phoneErr) errors.phone = phoneErr;
  if (addressErr) errors.address = addressErr;
  if (messageErr) errors.message = messageErr;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      name,
      email,
      phone: phoneDigits,
      address,
      message,
    },
  };
}
