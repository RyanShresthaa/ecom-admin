/**
 * Integration checks for Zod validation on live API (requires server).
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL || 'http://localhost:5000';

async function post(path, json, headers = {}) {
    const r = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(json),
    });
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body, requestId: r.headers.get('x-request-id') };
}

describe('Validation + request ID', { skip: process.env.SKIP_API_TESTS === '1' }, () => {
    before(async () => {
        const r = await fetch(`${BASE}/api/health`);
        if (r.status !== 200) throw new Error(`Server not up at ${BASE}`);
    });

    it('health echoes X-Request-Id when sent', async () => {
        const id = 'test-req-id-123';
        const r = await fetch(`${BASE}/api/health`, { headers: { 'X-Request-Id': id } });
        assert.equal(r.headers.get('x-request-id'), id);
    });

    it('register rejects invalid email with 400', async () => {
        const { status, body } = await post('/api/user/register', {
            name: 'A',
            email: 'not-an-email',
            password: 'Abcd1234',
        });
        assert.equal(status, 400);
        assert.equal(body.error, true);
    });

    it('login rejects malformed body', async () => {
        const { status } = await post('/api/user/login', { email: 'x', password: 'y' });
        assert.equal(status, 400);
    });
});
