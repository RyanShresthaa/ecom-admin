/**
 * Playwright config — cookie / auth browser E2E (Chromium, Firefox, WebKit).
 * Requires: API on E2E_API_URL (default http://127.0.0.1:5000), DB reachable.
 *
 *   npx playwright install
 *   npm run test:e2e:cookies
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: __dirname,
    testMatch: '**/*.spec.mjs',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1,
    timeout: 60_000,
    globalSetup: path.join(__dirname, 'global-setup.mjs'),
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_API_URL || 'http://127.0.0.1:5000',
        extraHTTPHeaders: {
            Origin: process.env.E2E_ORIGIN || 'http://localhost:3000',
        },
        trace: 'on-first-retry',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
});

