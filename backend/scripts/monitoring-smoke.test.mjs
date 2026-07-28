/**
 * Monitoring unit smoke tests (no live server required for most; health/metrics import checks).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeLabel, register } from '../config/metrics.js';
import { timingSafeEqualStr } from '../middleware/csrf.js';

describe('metrics registry', () => {
    it('exposes prometheus metrics text', async () => {
        const text = await register.metrics();
        assert.match(text, /http_request_duration_seconds|process_cpu|nodejs_/);
        assert.match(text, /business_orders_total|business_payments_total|business_checkout_total/);
        assert.ok(text.length > 100);
    });

    it('routeLabel collapses numeric ids', () => {
        const label = routeLabel({
            baseUrl: '/api/product',
            route: { path: '/:id' },
            originalUrl: '/api/product/123',
            method: 'GET',
        });
        assert.equal(label, '/api/product/:id');
    });
});

describe('csrf helper still works after monitoring changes', () => {
    it('timingSafeEqualStr', () => {
        assert.equal(timingSafeEqualStr('abc', 'abc'), true);
    });
});
