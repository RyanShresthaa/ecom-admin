/**
 * Auth security unit + integration tests (JWT, CSRF, extractors, login/refresh/logout when DB up).
 * Run: node --test scripts/auth-security.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

import { timingSafeEqualStr } from '../middleware/csrf.js';
import { extractAccessToken, extractRefreshToken } from '../utils/extractAuthToken.js';
import {
    getAccessSecret,
    getRefreshSecret,
    JWT_VERIFY_OPTIONS,
    getAccessTokenExpiresIn,
    getRefreshTokenExpiresIn,
} from '../config/security.js';
import { validateEnv } from '../config/validateEnv.js';

describe('timingSafeEqualStr (CSRF)', () => {
    it('matches equal strings', () => {
        assert.equal(timingSafeEqualStr('abc123', 'abc123'), true);
    });

    it('rejects unequal same-length strings', () => {
        assert.equal(timingSafeEqualStr('abc123', 'abc124'), false);
    });

    it('rejects length mismatch safely', () => {
        assert.equal(timingSafeEqualStr('short', 'muchlonger'), false);
        assert.equal(timingSafeEqualStr('', 'x'), false);
        assert.equal(timingSafeEqualStr(null, 'x'), false);
    });
});

describe('extractAccessToken', () => {
    it('prefers accessToken cookie', () => {
        const r = extractAccessToken({
            cookies: { accessToken: 'cookie-jwt', token: 'legacy' },
            headers: { authorization: 'Bearer header-jwt' },
        });
        assert.equal(r.token, 'cookie-jwt');
        assert.equal(r.source, 'cookie');
    });

    it('ignores legacy token cookie', () => {
        const r = extractAccessToken({
            cookies: { token: 'legacy-only' },
            headers: {},
        });
        assert.equal(r.token, null);
    });

    it('accepts Bearer header', () => {
        const r = extractAccessToken({
            cookies: {},
            headers: { authorization: 'Bearer my.jwt.token' },
        });
        assert.equal(r.token, 'my.jwt.token');
        assert.equal(r.source, 'bearer');
    });

    it('rejects malformed Authorization', () => {
        const r = extractAccessToken({
            cookies: {},
            headers: { authorization: 'Token abc' },
        });
        assert.equal(r.error, 'malformed_authorization');
        assert.equal(r.token, null);
    });

    it('rejects Basic auth style', () => {
        const r = extractAccessToken({
            cookies: {},
            headers: { authorization: 'Basic dXNlcjpwYXNz' },
        });
        assert.equal(r.error, 'malformed_authorization');
    });
});

describe('extractRefreshToken', () => {
    it('reads refreshToken cookie', () => {
        const r = extractRefreshToken({
            cookies: { refreshToken: 'refresh-jwt' },
            headers: {},
        });
        assert.equal(r.token, 'refresh-jwt');
    });
});

describe('JWT verify options', () => {
    it('accepts HS256', () => {
        const token = jwt.sign({ id: 1 }, getAccessSecret(), {
            algorithm: 'HS256',
            expiresIn: 60,
        });
        const decoded = jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        assert.equal(decoded.id, 1);
    });

    it('rejects wrong algorithm (none)', () => {
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ id: 1 })).toString('base64url');
        const forged = `${header}.${payload}.`;
        assert.throws(() => jwt.verify(forged, getAccessSecret(), JWT_VERIFY_OPTIONS));
    });

    it('rejects invalid JWT', () => {
        assert.throws(() => jwt.verify('not.a.jwt', getAccessSecret(), JWT_VERIFY_OPTIONS));
    });

    it('rejects expired access token', () => {
        const token = jwt.sign({ id: 1 }, getAccessSecret(), {
            algorithm: 'HS256',
            expiresIn: -10,
        });
        assert.throws(() => jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS));
    });

    it('rejects token signed with refresh secret as access', () => {
        const token = jwt.sign({ id: 1 }, getRefreshSecret(), {
            algorithm: 'HS256',
            expiresIn: 60,
        });
        assert.throws(() => jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS));
    });
});

describe('validateEnv production secrets', () => {
    it('throws in production when secrets identical', () => {
        const keys = [
            'NODE_ENV',
            'DB_NAME',
            'DB_USER',
            'CORS_ORIGINS',
            'SECRET_KEY_ACCESS_TOKEN',
            'SECRET_KEY_REFRESH_TOKEN',
            'JWT_SECRET',
            'CLIENT_URL',
        ];
        const snap = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
        const err = console.error;
        const warn = console.warn;
        console.error = () => {};
        console.warn = () => {};
        try {
            process.env.NODE_ENV = 'production';
            process.env.DB_NAME = 'x';
            process.env.DB_USER = 'x';
            process.env.CORS_ORIGINS = 'https://a.com';
            process.env.SECRET_KEY_ACCESS_TOKEN = 'a'.repeat(40);
            process.env.SECRET_KEY_REFRESH_TOKEN = 'a'.repeat(40);
            delete process.env.JWT_SECRET;
            assert.throws(() => validateEnv(), /Invalid environment/);
        } finally {
            console.error = err;
            console.warn = warn;
            for (const [k, v] of Object.entries(snap)) {
                if (v === undefined) delete process.env[k];
                else process.env[k] = v;
            }
        }
    });
});

describe('auth integration (DB)', () => {
    let pool;
    let loginController;
    let refreshToken;
    let logOutController;
    let findUserByEmail;
    let updateUser;
    let userId;
    const email = `auth-sec-${Date.now()}@test.local`;
    const password = 'SecurePass1';

    function mockRes() {
        const cookies = {};
        const cleared = [];
        return {
            cookies,
            cleared,
            statusCode: 200,
            body: null,
            cookie(name, value) {
                cookies[name] = value;
                return this;
            },
            clearCookie(name) {
                cleared.push(name);
                delete cookies[name];
                return this;
            },
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.body = payload;
                return this;
            },
        };
    }

    before(async () => {
        if (process.env.SKIP_DB_TESTS === '1') return;
        try {
            pool = (await import('../config/connectDB.js')).default;
            await pool.query('SELECT 1');
            ({ loginController, refreshToken, logOutController } = await import(
                '../controllers/user.controller.js'
            ));
            ({ findUserByEmail, updateUser } = await import('../models/user.model.js'));
            const hash = await bcrypt.hash(password, 10);
            const r = await pool.query(
                `INSERT INTO users (name, email, password, role, status, verify_email)
                 VALUES ($1, $2, $3, 'User', 'Active', true)
                 RETURNING id`,
                ['Auth Sec User', email, hash],
            );
            userId = r.rows[0].id;
        } catch {
            pool = null;
        }
    });

    after(async () => {
        if (pool && userId) {
            await pool.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
        }
    });

    it('login sets cookies and does not return JWTs in JSON', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const req = {
            body: { email, password },
            cookies: {},
            headers: {},
            ip: '127.0.0.1',
            get: () => '',
        };
        const res = mockRes();
        await loginController(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.cookies.accessToken);
        assert.ok(res.cookies.refreshToken);
        assert.ok(res.body.data.csrfToken);
        assert.ok(res.body.data.user);
        assert.equal(res.body.data.accesstoken, undefined);
        assert.equal(res.body.data.accessToken, undefined);
        assert.equal(res.body.data.refreshToken, undefined);
    });

    it('refresh rotates cookies without JWTs in JSON', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const loginReq = {
            body: { email, password },
            cookies: {},
            headers: {},
            ip: '127.0.0.1',
            get: () => '',
        };
        const loginRes = mockRes();
        await loginController(loginReq, loginRes);
        const oldRefresh = loginRes.cookies.refreshToken;

        const refreshReq = {
            cookies: { refreshToken: oldRefresh },
            headers: {},
            ip: '127.0.0.1',
            get: () => '',
        };
        const refreshRes = mockRes();
        await refreshToken(refreshReq, refreshRes);
        assert.equal(refreshRes.statusCode, 200);
        assert.ok(refreshRes.cookies.accessToken);
        assert.ok(refreshRes.cookies.refreshToken);
        assert.notEqual(refreshRes.cookies.refreshToken, oldRefresh);
        assert.equal(refreshRes.body.data.accesstoken, undefined);
        assert.equal(refreshRes.body.data.refreshToken, undefined);
        assert.ok(refreshRes.body.data.csrfToken);
    });

    it('refresh replay within grace is accepted; after grace is rejected', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const prevGrace = process.env.REFRESH_ROTATION_GRACE_MS;
        process.env.REFRESH_ROTATION_GRACE_MS = '30000';

        const loginRes = mockRes();
        await loginController(
            { body: { email, password }, cookies: {}, headers: {}, ip: '127.0.0.1', get: () => '' },
            loginRes,
        );
        const oldRefresh = loginRes.cookies.refreshToken;

        const first = mockRes();
        await refreshToken(
            { cookies: { refreshToken: oldRefresh }, headers: {}, ip: '127.0.0.1', get: () => '' },
            first,
        );
        assert.equal(first.statusCode, 200);

        // Multi-tab: old cookie still accepted during grace
        const concurrent = mockRes();
        await refreshToken(
            { cookies: { refreshToken: oldRefresh }, headers: {}, ip: '127.0.0.1', get: () => '' },
            concurrent,
        );
        assert.equal(concurrent.statusCode, 200);
        assert.ok(concurrent.cookies.accessToken);

        // Expire grace and treat as reuse
        await updateUser(userId, { refresh_token_prev_until: new Date(Date.now() - 1000) });
        const replay = mockRes();
        await refreshToken(
            { cookies: { refreshToken: oldRefresh }, headers: {}, ip: '127.0.0.1', get: () => '' },
            replay,
        );
        assert.equal(replay.statusCode, 401);

        if (prevGrace === undefined) delete process.env.REFRESH_ROTATION_GRACE_MS;
        else process.env.REFRESH_ROTATION_GRACE_MS = prevGrace;
    });

    it('expired refresh token is rejected', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const expired = jwt.sign({ id: userId }, getRefreshSecret(), {
            algorithm: 'HS256',
            expiresIn: -5,
        });
        await updateUser(userId, { refresh_token: expired });
        const res = mockRes();
        await refreshToken(
            { cookies: { refreshToken: expired }, headers: {}, ip: '127.0.0.1', get: () => '' },
            res,
        );
        assert.equal(res.statusCode, 401);
    });

    it('logout clears cookies', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const res = mockRes();
        await logOutController({ userId, cookies: {}, headers: {}, ip: '127.0.0.1', get: () => '' }, res);
        assert.equal(res.body.success, true);
        assert.ok(res.cleared.includes('accessToken'));
        assert.ok(res.cleared.includes('refreshToken'));
        assert.ok(res.cleared.includes('csrfToken'));
    });

    it('role authorization: User cannot pass Admin requireRole', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const { requireRole } = await import('../middleware/roles.js');
        const { findUserById } = await import('../models/user.model.js');
        const user = await findUserById(userId);
        const adminOnly = requireRole('Admin');
        const req = { userId, user };
        const res = mockRes();
        let nextCalled = false;
        await adminOnly(req, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 403);
    });

    it('requireRole reuses req.user without error', async (t) => {
        if (!pool || !userId) {
            t.skip();
            return;
        }
        const { requireRole } = await import('../middleware/roles.js');
        const { findUserById } = await import('../models/user.model.js');
        const user = await findUserById(userId);
        const userRole = requireRole('User');
        const req = { userId, user };
        const res = mockRes();
        let nextCalled = false;
        await userRole(req, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
    });

    it('TTL helpers are positive', () => {
        assert.ok(getAccessTokenExpiresIn() > 0);
        assert.ok(getRefreshTokenExpiresIn() > 0);
    });
});
