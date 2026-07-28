# Cookie / auth Playwright E2E

## Prerequisites

1. **Local API on `E2E_API_URL` (default `http://127.0.0.1:5000`)** — prefer `node server.js`, not nodemon (restarts cause flakes).
2. PostgreSQL reachable (global setup upserts `e2e-cookies@test.local`).
3. Non-production API with `E2E_RELAX_RATE_LIMIT=true` (skips rate limits). **Never** set in production — `runProductionChecks` will refuse to boot if it is.
4. Browsers: `npm run playwright:install`

### Port conflict (Windows + Docker)

`docker compose` publishes the API on **`127.0.0.1:5001`** so it does not steal `:5000` from `npm run dev`.

If an older Compose stack still maps `127.0.0.1:5000`, Playwright/curl to that address hit the **container** (`NODE_ENV=production`, rate limits on). Stop it or recreate:

```bash
docker compose up -d --force-recreate api
# API → http://127.0.0.1:5001
```

Global setup probes 12 logins and fails fast on 429 with a clear message.

## Run

```bash
cd backend
npm run test:e2e:cookies
# or one engine:
npx playwright test -c e2e/playwright.config.mjs --project=chromium
```

## Coverage

Login, logout, refresh rotation, page reload, multi-tab, expired access/refresh, invalid CSRF, cookie deletion / session clear — asserts **browser cookie jar** attributes (`httpOnly`, `path`, values).
