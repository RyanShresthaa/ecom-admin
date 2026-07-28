/**
 * Cookie option unit tests (secure, sameSite, path, maxAge) for prod vs development.
 * Run: node --test scripts/cookie-security.test.mjs
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    getAccessCookieOptions,
    getRefreshCookieOptions,
    getAccessTokenTtlMs,
    getRefreshTokenTtlMs,
    getAccessTokenExpiresIn,
    resolveCookieSameSite,
    getClearAccessCookieOptions,
    getClearRefreshCookieOptions,
    getCsrfCookieOptions,
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
    'CLIENT_URL',
    'FRONTEND_URL',
];

describe('cookie options', () => {
    let snap;

    beforeEach(() => {
        snap = snapshotEnv(ENV_KEYS);
        process.env.ACCESS_TOKEN_EXPIRES = '15m';
        process.env.REFRESH_TOKEN_EXPIRES = '7d';
        process.env.ACCESS_TOKEN_MAX_AGE_MS = '900000';
        process.env.REFRESH_TOKEN_MAX_AGE_MS = '604800000';
        process.env.CORS_ORIGINS = 'http://localhost:3000';
        process.env.API_PUBLIC_ORIGIN = 'http://localhost:5000';
        delete process.env.COOKIE_SAMESITE;
        delete process.env.COOKIE_PARTITIONED;
        delete process.env.COOKIE_DOMAIN;
    });

    afterEach(() => {
        restoreEnv(snap);
    });

    it('development: access cookie is httpOnly, path /, maxAge synced, SameSite=Lax', () => {
        process.env.NODE_ENV = 'development';
        const opts = getAccessCookieOptions();
        assert.equal(opts.httpOnly, true);
        assert.equal(opts.path, '/');
        assert.equal(opts.maxAge, getAccessTokenTtlMs());
        assert.equal(opts.maxAge, 900_000);
        assert.equal(opts.sameSite, 'lax');
        assert.equal(opts.secure, false);
        assert.equal(opts.domain, undefined);
    });

    it('development: refresh cookie path scoped to /api/user', () => {
        process.env.NODE_ENV = 'development';
        const opts = getRefreshCookieOptions();
        assert.equal(opts.path, '/api/user');
        assert.equal(opts.maxAge, getRefreshTokenTtlMs());
        assert.equal(opts.maxAge, 604_800_000);
        assert.equal(opts.sameSite, 'lax');
        assert.equal(opts.httpOnly, true);
    });

    it('production same-site: SameSite=Lax, Secure, no Partitioned', () => {
        process.env.NODE_ENV = 'production';
        process.env.CORS_ORIGINS = 'https://shop.example.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        const opts = getAccessCookieOptions();
        assert.equal(opts.sameSite, 'lax');
        assert.equal(opts.secure, true);
        assert.equal(opts.httpOnly, true);
        assert.equal(opts.path, '/');
        assert.equal(opts.maxAge, 900_000);
        assert.equal(opts.partitioned, undefined);
    });

    it('production cross-site auto: SameSite=None, Secure, Partitioned', () => {
        process.env.NODE_ENV = 'production';
        process.env.COOKIE_PARTITIONED = 'auto';
        process.env.CORS_ORIGINS = 'https://frontend.other.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        assert.equal(resolveCookieSameSite(), 'none');
        const opts = getAccessCookieOptions();
        assert.equal(opts.sameSite, 'none');
        assert.equal(opts.secure, true);
        assert.equal(opts.partitioned, true);
        assert.equal(opts.domain, undefined);
    });

    it('COOKIE_PARTITIONED=false disables Partitioned even for cross-site', () => {
        process.env.NODE_ENV = 'production';
        process.env.COOKIE_PARTITIONED = 'false';
        process.env.CORS_ORIGINS = 'https://frontend.other.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        assert.equal(getAccessCookieOptions().partitioned, undefined);
    });

    it('development cross-site auto: no Partitioned (avoids CHIPS surprises locally)', () => {
        process.env.NODE_ENV = 'development';
        process.env.COOKIE_PARTITIONED = 'auto';
        process.env.CORS_ORIGINS = 'https://frontend.other.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        const opts = getAccessCookieOptions();
        assert.equal(opts.sameSite, 'none');
        assert.equal(opts.secure, true);
        assert.equal(opts.partitioned, undefined);
    });

    it('clear options mirror Path/Secure/SameSite and expire immediately', () => {
        process.env.NODE_ENV = 'production';
        process.env.CORS_ORIGINS = 'https://shop.example.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        const access = getAccessCookieOptions();
        const clearA = getClearAccessCookieOptions();
        assert.equal(clearA.path, access.path);
        assert.equal(clearA.secure, access.secure);
        assert.equal(clearA.sameSite, access.sameSite);
        assert.equal(clearA.httpOnly, true);
        assert.equal(clearA.maxAge, 0);
        assert.ok(clearA.expires instanceof Date);
        assert.equal(clearA.expires.getTime(), 0);

        const refresh = getRefreshCookieOptions();
        const clearR = getClearRefreshCookieOptions();
        assert.equal(clearR.path, refresh.path);

        const csrf = getCsrfCookieOptions();
        assert.equal(csrf.httpOnly, false);
        assert.equal(csrf.maxAge, getRefreshTokenTtlMs());
    });

    it('COOKIE_SAMESITE override wins', () => {
        process.env.NODE_ENV = 'production';
        process.env.COOKIE_SAMESITE = 'strict';
        process.env.CORS_ORIGINS = 'https://frontend.other.com';
        process.env.API_PUBLIC_ORIGIN = 'https://api.example.com';
        assert.equal(getAccessCookieOptions().sameSite, 'strict');
    });

    it('invalid MAX_AGE_MS falls back to EXPIRES-derived TTL', () => {
        process.env.ACCESS_TOKEN_MAX_AGE_MS = '-1';
        process.env.ACCESS_TOKEN_EXPIRES = '10m';
        assert.equal(getAccessTokenTtlMs(), 600_000);
        assert.equal(getAccessCookieOptions().maxAge, 600_000);
    });

    it('JWT expiresIn seconds match cookie maxAge', () => {
        process.env.ACCESS_TOKEN_EXPIRES = '15m';
        const opts = getAccessCookieOptions();
        assert.equal(getAccessTokenExpiresIn() * 1000, opts.maxAge);
    });
});
