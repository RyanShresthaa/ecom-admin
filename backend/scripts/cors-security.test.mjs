/**
 * CORS origin normalization & allowlist unit tests.
 * Run: node --test scripts/cors-security.test.mjs
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeOrigin,
    parseAllowedOrigins,
    isOriginAllowed,
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

describe('normalizeOrigin', () => {
    it('strips trailing slash', () => {
        assert.equal(normalizeOrigin('http://localhost:3000/'), 'http://localhost:3000');
    });

    it('lowercases host', () => {
        assert.equal(normalizeOrigin('http://LocalHost:3000'), 'http://localhost:3000');
    });

    it('trims spaces', () => {
        assert.equal(normalizeOrigin('  https://example.com  '), 'https://example.com');
    });

    it('rejects paths', () => {
        assert.equal(normalizeOrigin('http://localhost:3000/app'), null);
    });

    it('rejects null string', () => {
        assert.equal(normalizeOrigin('null'), null);
    });

    it('rejects invalid values', () => {
        assert.equal(normalizeOrigin('not-a-url'), null);
        assert.equal(normalizeOrigin(''), null);
        assert.equal(normalizeOrigin(undefined), null);
    });
});

describe('parseAllowedOrigins', () => {
    let snap;

    beforeEach(() => {
        snap = snapshotEnv(['CORS_ORIGINS', 'CLIENT_URL', 'FRONTEND_URL']);
        delete process.env.CORS_ORIGINS;
        delete process.env.CLIENT_URL;
        delete process.env.FRONTEND_URL;
    });

    afterEach(() => {
        restoreEnv(snap);
    });

    it('deduplicates and normalizes', () => {
        process.env.CORS_ORIGINS =
            'http://localhost:3000/, http://LOCALHOST:3000, https://app.example.com';
        const origins = parseAllowedOrigins();
        assert.deepEqual(origins, ['http://localhost:3000', 'https://app.example.com']);
    });

    it('skips invalid entries', () => {
        process.env.CORS_ORIGINS = 'http://ok.test, bogus, ftp://bad.com';
        const origins = parseAllowedOrigins();
        assert.deepEqual(origins, ['http://ok.test']);
    });
});

describe('isOriginAllowed', () => {
    const allow = ['http://localhost:3000', 'https://shop.example.com'];

    it('allows listed origin', () => {
        const r = isOriginAllowed('http://localhost:3000', allow);
        assert.equal(r.allowed, true);
    });

    it('allows trailing-slash variant of listed origin', () => {
        const r = isOriginAllowed('http://localhost:3000/', allow);
        assert.equal(r.allowed, true);
    });

    it('allows uppercase host variant', () => {
        const r = isOriginAllowed('http://LOCALHOST:3000', allow);
        assert.equal(r.allowed, true);
    });

    it('denies unknown origin', () => {
        const r = isOriginAllowed('https://evil.example', allow);
        assert.equal(r.allowed, false);
        assert.equal(r.reason, 'not_allowlisted');
    });

    it('denies null origin', () => {
        const r = isOriginAllowed('null', allow);
        assert.equal(r.allowed, false);
        assert.equal(r.reason, 'null_origin');
    });

    it('allows missing origin (non-browser / same-origin tools)', () => {
        const r = isOriginAllowed(undefined, allow);
        assert.equal(r.allowed, true);
        assert.equal(r.reason, 'missing_origin');
    });

    it('denies invalid origin string', () => {
        const r = isOriginAllowed('://bad', allow);
        assert.equal(r.allowed, false);
    });
});
