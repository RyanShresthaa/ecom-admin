/**
 * Cookie attribute regression — serializes options the same way Express does (`cookie` package)
 * and asserts every attribute for accessToken / refreshToken / csrfToken + clear mirrors.
 *
 * Run: node --test scripts/cookie-regression.test.mjs
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { serialize } from 'cookie';
import {
    getAccessCookieOptions,
    getRefreshCookieOptions,
    getCsrfCookieOptions,
    getClearAccessCookieOptions,
    getClearRefreshCookieOptions,
    getClearCsrfCookieOptions,
    getAccessTokenTtlMs,
    getRefreshTokenTtlMs,
} from '../config/security.js';

function snapshotEnv(keys) {
    const snap = {};
    for (const k of keys) snap[k] = process.env[k];
    return snap;
}

function restoreEnv(snap) {
    for (const [k, v] of Object.entries(snap)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
}

const ENV_KEYS = [
    'NODE_ENV',
    'ACCESS_TOKEN_EXPIRES',
    'REFRESH_TOKEN_EXPIRES',
    'ACCESS_TOKEN_MAX_AGE_MS',
    'REFRESH_TOKEN_MAX_AGE_MS',
    'CORS_ORIGINS',
    'API_PUBLIC_ORIGIN',
    'COOKIE_SAMESITE',
    'COOKIE_PARTITIONED',
    'COOKIE_DOMAIN',
];

/** Parse Set-Cookie attribute bag (name=value already stripped). */
function parseSetCookieAttrs(header) {
    const parts = header.split(';').map((p) => p.trim());
    const [nv, ...attrs] = parts;
    const eq = nv.indexOf('=');
    const name = eq >= 0 ? nv.slice(0, eq) : nv;
    const value = eq >= 0 ? nv.slice(eq + 1) : '';
    const out = { name, value, attrs: {} };
    for (const a of attrs) {
        const i = a.indexOf('=');
        if (i < 0) {
            out.attrs[a.toLowerCase()] = true;
        } else {
            out.attrs[a.slice(0, i).trim().toLowerCase()] = a.slice(i + 1).trim();
        }
    }
    return out;
}

/** Mimic Express res.cookie: maxAge is ms in options, seconds in Set-Cookie. */
function expressSerialize(name, value, opts) {
    const o = { ...opts };
    if (typeof o.maxAge === 'number') {
        if (!o.expires) o.expires = new Date(Date.now() + o.maxAge);
        o.maxAge = Math.floor(o.maxAge / 1000);
    }
    return serialize(name, value, o);
}

function assertCookieHeader(name, value, opts, expectations) {
    const header = expressSerialize(name, value, opts);
    const parsed = parseSetCookieAttrs(header);
    assert.equal(parsed.name, name);
    assert.ok(parsed.value.length > 0 || value === '');

    if (expectations.httpOnly === true) assert.equal(parsed.attrs.httponly, true);
    if (expectations.httpOnly === false) assert.equal(parsed.attrs.httponly, undefined);

    if (expectations.secure === true) assert.equal(parsed.attrs.secure, true);
    if (expectations.secure === false) assert.equal(parsed.attrs.secure, undefined);

    if (expectations.sameSite) {
        assert.equal(String(parsed.attrs.samesite).toLowerCase(), expectations.sameSite.toLowerCase());
    }

    if (expectations.path !== undefined) {
        assert.equal(parsed.attrs.path, expectations.path);
    }

    if (expectations.domain === undefined || expectations.domain === null) {
        assert.equal(parsed.attrs.domain, undefined);
    } else {
        assert.equal(parsed.attrs.domain, expectations.domain);
    }

    if (expectations.maxAge !== undefined) {
        assert.equal(Number(parsed.attrs['max-age']), expectations.maxAge);
    }

    if (expectations.expires === true) {
        assert.ok(parsed.attrs.expires, 'Expires attribute must be present when maxAge is set');
    }

    if (expectations.partitioned === true) assert.equal(parsed.attrs.partitioned, true);
    if (expectations.partitioned === false) assert.equal(parsed.attrs.partitioned, undefined);

    return { header, parsed };
}

describe('cookie attribute regression (Set-Cookie serialization)', () => {
    let snap;

    beforeEach(() => {
        snap = snapshotEnv(ENV_KEYS);
        process.env.ACCESS_TOKEN_EXPIRES = '15m';
        process.env.REFRESH_TOKEN_EXPIRES = '7d';
        process.env.ACCESS_TOKEN_MAX_AGE_MS = '900000';
        process.env.REFRESH_TOKEN_MAX_AGE_MS = '604800000';
        delete process.env.COOKIE_SAMESITE;
        delete process.env.COOKIE_PARTITIONED;
        delete process.env.COOKIE_DOMAIN;
    });

    afterEach(() => restoreEnv(snap));

    describe('production same-site (shop + api under example.com)', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
            process.env.CORS_ORIGINS = 'https://shop.example.com';
            process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
            process.env.COOKIE_PARTITIONED = 'auto';
        });

        it('accessToken attributes', () => {
            const opts = getAccessCookieOptions();
            assertCookieHeader('accessToken', 'jwt.access', opts, {
                httpOnly: true,
                secure: true,
                sameSite: 'Lax',
                path: '/',
                domain: null,
                maxAge: Math.floor(getAccessTokenTtlMs() / 1000),
                expires: true,
                partitioned: false,
            });
            assert.equal(opts.maxAge, getAccessTokenTtlMs());
        });

        it('refreshToken attributes', () => {
            const opts = getRefreshCookieOptions();
            assertCookieHeader('refreshToken', 'jwt.refresh', opts, {
                httpOnly: true,
                secure: true,
                sameSite: 'Lax',
                path: '/api/user',
                domain: null,
                maxAge: Math.floor(getRefreshTokenTtlMs() / 1000),
                expires: true,
                partitioned: false,
            });
        });

        it('csrfToken attributes (NOT HttpOnly)', () => {
            const opts = getCsrfCookieOptions();
            assert.equal(opts.httpOnly, false);
            assertCookieHeader('csrfToken', 'csrf.hex', opts, {
                httpOnly: false,
                secure: true,
                sameSite: 'Lax',
                path: '/',
                domain: null,
                maxAge: Math.floor(getRefreshTokenTtlMs() / 1000),
                expires: true,
                partitioned: false,
            });
        });

        it('deletion mirrors attributes for all three cookies', () => {
            for (const [name, clearFn, httpOnly] of [
                ['accessToken', getClearAccessCookieOptions, true],
                ['refreshToken', getClearRefreshCookieOptions, true],
                ['csrfToken', getClearCsrfCookieOptions, false],
            ]) {
                const setOpts =
                    name === 'accessToken'
                        ? getAccessCookieOptions()
                        : name === 'refreshToken'
                          ? getRefreshCookieOptions()
                          : getCsrfCookieOptions();
                const clear = clearFn();
                assert.equal(clear.path, setOpts.path);
                assert.equal(clear.secure, setOpts.secure);
                assert.equal(clear.sameSite, setOpts.sameSite);
                assert.equal(clear.domain, setOpts.domain);
                assert.equal(Boolean(clear.partitioned), Boolean(setOpts.partitioned));
                assert.equal(clear.httpOnly, httpOnly);
                assert.equal(clear.maxAge, 0);
                assert.equal(clear.expires.getTime(), 0);

                const { parsed } = assertCookieHeader(name, '', clear, {
                    httpOnly,
                    secure: true,
                    sameSite: 'Lax',
                    path: clear.path,
                    domain: null,
                    maxAge: 0,
                    expires: true,
                    partitioned: false,
                });
                assert.ok(parsed.attrs.expires);
            }
        });
    });

    describe('production cross-site with Partitioned auto', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
            process.env.CORS_ORIGINS = 'https://app.other.com';
            process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
            process.env.COOKIE_PARTITIONED = 'auto';
        });

        it('accessToken includes Partitioned', () => {
            assertCookieHeader('accessToken', 'jwt', getAccessCookieOptions(), {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                domain: null,
                maxAge: Math.floor(getAccessTokenTtlMs() / 1000),
                expires: true,
                partitioned: true,
            });
        });

        it('clearCookie includes Partitioned when set cookies did', () => {
            const clear = getClearAccessCookieOptions();
            assert.equal(clear.partitioned, true);
            assertCookieHeader('accessToken', '', clear, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 0,
                expires: true,
                partitioned: true,
            });
        });
    });
});

