/**
 * Optional API smoke tests — requires running server.
 * Run: npm run test:api   (with npm run dev in another terminal)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL || 'http://localhost:5000';

async function get(path) {
    const r = await fetch(`${BASE}${path}`);
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
}

async function post(path, json) {
    const r = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
    });
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
}

describe('API smoke', { skip: process.env.SKIP_API_TESTS === '1' }, () => {
    before(async () => {
        const { status } = await get('/api/health');
        if (status !== 200) {
            throw new Error(`Server not healthy at ${BASE} — start with npm run dev`);
        }
    });

    it('GET /api/health returns ok', async () => {
        const { status, body } = await get('/api/health');
        assert.equal(status, 200);
        assert.equal(body.ok, true);
    });

    it('GET /api/shop/settings is public', async () => {
        const { status, body } = await get('/api/shop/settings');
        assert.equal(status, 200);
        assert.equal(body.success, true);
        assert.ok(body.data.currency);
    });

    it('POST /api/coupon/validate without auth works', async () => {
        const { status } = await post('/api/coupon/validate', { code: 'NONE' });
        assert.ok(status === 404 || status === 200);
    });

    it('POST /api/user/register rejects weak password', async () => {
        const { status, body } = await post('/api/user/register', {
            name: 'Test',
            email: `weak-${Date.now()}@example.com`,
            password: 'weak',
        });
        assert.equal(status, 400);
        assert.equal(body.error, true);
    });
});
