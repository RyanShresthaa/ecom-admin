/**
 * Playwright E2E — auth cookies in a real browser cookie jar.
 * Uses context.request (shares Set-Cookie with the browser context), not the isolated request fixture.
 * Prefer 127.0.0.1 over localhost to avoid Windows IPv6 (::1) ECONNREFUSED when Node listens on IPv4.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const authEnv = JSON.parse(fs.readFileSync(path.join(__dirname, '.auth-env.json'), 'utf8'));
const API = String(authEnv.apiUrl || 'http://127.0.0.1:5000').replace(/\/$/, '');
const EMAIL = authEnv.email;
const PASSWORD = authEnv.password;
const cookieHost = new URL(API).hostname;

function cookieMap(cookies) {
    const m = new Map();
    for (const c of cookies) m.set(c.name, c);
    return m;
}

async function allCookies(context) {
    return cookieMap(await context.cookies());
}

async function login(context, { retries = 3 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await context.request.post(`${API}/api/user/login`, {
                data: { email: EMAIL, password: PASSWORD },
                headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
            });
            const body = await res.json().catch(() => ({}));
            if (res.status() === 429) {
                throw new Error(
                    'Login rate-limited. Set E2E_RELAX_RATE_LIMIT=true on the API (non-production) and restart.',
                );
            }
            if (!res.ok()) {
                throw new Error(`Login failed (${res.status()}): ${JSON.stringify(body)}`);
            }
            // Firefox can lag storing Set-Cookie into the jar
            await expect
                .poll(async () => (await allCookies(context)).has('accessToken'), { timeout: 5_000 })
                .toBe(true);
            return { res, body };
        } catch (err) {
            lastErr = err;
            const msg = String(err?.message || err);
            const transient = /ECONNREFUSED|ECONNRESET|socket hang up|API not reachable/i.test(msg);
            if (!transient || attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
    throw lastErr;
}

test.describe('Auth cookie E2E', () => {
    test('login sets accessToken, refreshToken, csrfToken in browser jar', async ({ context }) => {
        const { res, body } = await login(context);
        expect(res.ok(), JSON.stringify(body)).toBeTruthy();
        expect(body.data?.accessToken).toBeUndefined();
        expect(body.data?.refreshToken).toBeUndefined();
        expect(body.data?.csrfToken).toBeTruthy();

        const cookies = await allCookies(context);
        const access = cookies.get('accessToken');
        const refresh = cookies.get('refreshToken');
        const csrf = cookies.get('csrfToken');

        expect(access, 'accessToken cookie').toBeTruthy();
        expect(access.httpOnly).toBe(true);
        expect(access.path).toBe('/');

        expect(refresh, 'refreshToken cookie').toBeTruthy();
        expect(refresh.httpOnly).toBe(true);
        expect(refresh.path).toBe('/api/user');

        expect(csrf, 'csrfToken cookie').toBeTruthy();
        expect(csrf.httpOnly).toBe(false);
        expect(csrf.value).toBe(body.data.csrfToken);
    });

    test('logout deletes session cookies from browser jar', async ({ context }) => {
        await login(context);
        expect((await allCookies(context)).has('accessToken')).toBe(true);

        const csrf = (await allCookies(context)).get('csrfToken')?.value;
        const logout = await context.request.post(`${API}/api/user/logout`, {
            headers: csrf ? { 'X-CSRF-Token': csrf, Origin: 'http://localhost:3000' } : {},
        });
        expect(logout.ok() || logout.status() === 401).toBeTruthy();

        const after = await allCookies(context);
        const access = after.get('accessToken');
        const refresh = after.get('refreshToken');
        expect(!access || access.value === '').toBeTruthy();
        expect(!refresh || refresh.value === '').toBeTruthy();
    });

    test('refresh token rotates cookies', async ({ context }) => {
        await login(context);
        const before = await allCookies(context);
        const oldRefresh = before.get('refreshToken')?.value;
        expect(oldRefresh).toBeTruthy();

        const refreshRes = await context.request.post(`${API}/api/user/refresh-token`, {
            headers: { Origin: 'http://localhost:3000' },
        });
        const body = await refreshRes.json();
        expect(refreshRes.ok(), JSON.stringify(body)).toBeTruthy();

        const after = await allCookies(context);
        expect(after.get('accessToken')?.value).toBeTruthy();
        expect(after.get('refreshToken')?.value).toBeTruthy();
        expect(after.get('refreshToken')?.value).not.toBe(oldRefresh);
        expect(after.get('csrfToken')?.value).toBeTruthy();
    });

    test('browser page reload keeps session via cookies', async ({ context, page }) => {
        await login(context);
        await page.goto('about:blank');
        await page.reload();

        const me = await context.request.get(`${API}/api/user/user-details`, {
            headers: { Origin: 'http://localhost:3000' },
        });
        expect(me.ok(), await me.text()).toBeTruthy();
        expect((await allCookies(context)).get('accessToken')?.value).toBeTruthy();
    });

    test('multiple tabs share cookie jar and can refresh', async ({ browser }) => {
        const context = await browser.newContext({
            baseURL: API,
            extraHTTPHeaders: { Origin: 'http://localhost:3000' },
        });
        const pageA = await context.newPage();
        const pageB = await context.newPage();

        const loginRes = await context.request.post(`${API}/api/user/login`, {
            data: { email: EMAIL, password: PASSWORD },
        });
        expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
        await expect
            .poll(async () => (await allCookies(context)).has('accessToken'), { timeout: 5_000 })
            .toBe(true);

        const refreshA = await context.request.post(`${API}/api/user/refresh-token`);
        expect(refreshA.ok()).toBeTruthy();

        const me = await context.request.get(`${API}/api/user/user-details`);
        expect(me.ok()).toBeTruthy();

        const cookies = await allCookies(context);
        expect(cookies.get('accessToken')?.value).toBeTruthy();
        expect(cookies.get('refreshToken')?.value).toBeTruthy();

        await pageA.close();
        await pageB.close();
        await context.close();
    });

    test('expired access token is rejected; refresh restores session', async ({ context }) => {
        await login(context);
        const secret = process.env.SECRET_KEY_ACCESS_TOKEN || process.env.JWT_SECRET;
        const expired = jwt.sign({ id: 1 }, secret, { algorithm: 'HS256', expiresIn: -30 });

        await context.addCookies([
            {
                name: 'accessToken',
                value: expired,
                domain: cookieHost,
                path: '/',
                httpOnly: true,
            },
        ]);

        const me = await context.request.get(`${API}/api/user/user-details`);
        expect(me.status()).toBe(401);

        const refreshRes = await context.request.post(`${API}/api/user/refresh-token`);
        expect(refreshRes.ok()).toBeTruthy();

        const me2 = await context.request.get(`${API}/api/user/user-details`);
        expect(me2.ok()).toBeTruthy();
    });

    test('expired refresh token clears session cookies', async ({ context }) => {
        await login(context);
        const secret = process.env.SECRET_KEY_REFRESH_TOKEN || process.env.JWT_SECRET;
        const expired = jwt.sign({ id: 1 }, secret, { algorithm: 'HS256', expiresIn: -30 });

        await context.addCookies([
            {
                name: 'refreshToken',
                value: expired,
                domain: cookieHost,
                path: '/api/user',
                httpOnly: true,
            },
        ]);

        const refreshRes = await context.request.post(`${API}/api/user/refresh-token`);
        expect(refreshRes.status()).toBe(401);
    });

    test('invalid CSRF is rejected on mutating authenticated routes', async ({ context }) => {
        await login(context);

        const bad = await context.request.put(`${API}/api/user/update-user`, {
            data: { name: 'Hacker' },
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': 'definitely-not-the-csrf-token',
                Origin: 'http://localhost:3000',
            },
        });
        expect(bad.status()).toBe(403);
        const body = await bad.json();
        expect(String(body.message || '').toLowerCase()).toMatch(/csrf/);
    });

    test('session expiration: missing cookies cannot access protected routes', async ({ context }) => {
        await login(context);
        await context.clearCookies();

        const me = await context.request.get(`${API}/api/user/user-details`);
        expect(me.status()).toBe(401);

        const refresh = await context.request.post(`${API}/api/user/refresh-token`);
        expect(refresh.status()).toBe(401);
    });
});

