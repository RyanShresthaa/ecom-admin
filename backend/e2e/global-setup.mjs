/**
 * Playwright global setup — upserts E2E user and waits for API readiness.
 * Env: E2E_EMAIL, E2E_PASSWORD, E2E_API_URL. Requires DB + running API.
 */
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const email = process.env.E2E_EMAIL || 'e2e-cookies@test.local';
const password = process.env.E2E_PASSWORD || 'E2eCookiePass1!';
const apiUrl = (process.env.E2E_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

async function waitForApi(url, { attempts = 30, delayMs = 1000 } = {}) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(`${url}/api/health/live`);
            if (res.ok) {
                const body = await res.json().catch(() => ({}));
                return body;
            }
            lastErr = new Error(`HTTP ${res.status}`);
        } catch (err) {
            lastErr = err;
        }
        await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
        `API not reachable at ${url} after ${attempts}s. Start with: E2E_RELAX_RATE_LIMIT=true node server.js\n` +
            `If Docker Compose is up, API is on http://127.0.0.1:5001 — stop it or set E2E_API_URL.\n` +
            `Last error: ${lastErr?.message || lastErr}`,
    );
}

/** Fail fast when traffic hits Docker (production NODE_ENV) or a rate-limited instance. */
async function assertE2eFriendlyApi(url) {
    const probeEmail = `e2e-probe-${Date.now()}@test.local`;
    const statuses = [];
    for (let i = 0; i < 12; i++) {
        const res = await fetch(`${url}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: probeEmail, password: 'not-a-real-password' }),
        });
        statuses.push(res.status);
        if (res.status === 429) {
            throw new Error(
                `API at ${url} rate-limited login (got 429 on attempt ${i + 1}/12). ` +
                    `Point E2E_API_URL at local node with E2E_RELAX_RATE_LIMIT=true — not Docker Compose (host port 5001, NODE_ENV=production). ` +
                    `Statuses: ${statuses.join(',')}`,
            );
        }
    }
}

export default async function globalSetup() {
    const live = await waitForApi(apiUrl);

    // Docker container hostnames are short hex ids; local Node usually reports the OS hostname.
    if (live?.host && /^[0-9a-f]{12}$/i.test(String(live.host))) {
        console.warn(
            `[e2e] Warning: ${apiUrl} looks like a Docker API (host=${live.host}). ` +
                `Compose publishes 127.0.0.1:5001; local npm run dev should own :5000.`,
        );
    }

    await assertE2eFriendlyApi(apiUrl);

    const pool = new pg.Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await pool.query('SELECT 1');
        const hash = await bcrypt.hash(password, 10);
        const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (existing.rows[0]) {
            await pool.query(
                `UPDATE users SET
                    password = $2,
                    status = 'Active',
                    verify_email = true,
                    role = 'User',
                    refresh_token = '',
                    refresh_token_prev = '',
                    refresh_token_prev_until = NULL,
                    failed_login_attempts = 0,
                    locked_until = NULL,
                    updated_at = NOW()
                 WHERE email = $1`,
                [email, hash],
            );
        } else {
            await pool.query(
                `INSERT INTO users (name, email, password, role, status, verify_email)
                 VALUES ($1, $2, $3, 'User', 'Active', true)`,
                ['E2E Cookie User', email, hash],
            );
        }

        fs.writeFileSync(
            path.join(__dirname, '.auth-env.json'),
            JSON.stringify({ email, password, apiUrl }),
            'utf8',
        );
    } finally {
        await pool.end().catch(() => {});
    }
}
