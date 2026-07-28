# Authentication & cookies

Production guide for httpOnly session cookies, CSRF, SameSite, and browser behavior.

**Do not put JWTs in `localStorage`.** Access and refresh tokens are httpOnly cookies only.

## Authentication flow

1. Client `POST /api/user/login` (or `/google`, `/login-pin`) with credentials.
2. Server verifies credentials / lockout, then `issueAuthCookies`:
   - `accessToken` — short-lived JWT (default **15m**), `Path=/`, **HttpOnly**
   - `refreshToken` — long-lived JWT (default **7d**), `Path=/api/user`, **HttpOnly**
   - `csrfToken` — random hex, **not** HttpOnly (readable by JS for double-submit)
3. JSON body returns `{ csrfToken, user }` — **never** access/refresh JWTs.
4. Subsequent API calls use `credentials: 'include'` (browser sends cookies).

## Refresh flow

1. When access JWT expires, protected routes return **401**.
2. Client `POST /api/user/refresh-token` (CSRF-exempt bootstrap path).
3. Server validates refresh JWT + DB `refresh_token` (constant-time compare).
4. Rotates refresh (stores previous token for **grace** window — multi-tab), sets new cookies + CSRF.
5. Concurrent tabs presenting the previous refresh within `REFRESH_ROTATION_GRACE_MS` (default 30s) receive the current refresh + a new access token (not treated as theft).
6. Reuse after grace → session wiped (`refresh_token_reuse` security event).

Admin UI: axios interceptor single-flights refresh and syncs CSRF via `BroadcastChannel`.

## Logout flow

1. `POST /api/user/logout` with valid session + CSRF.
2. Server clears `refresh_token` / prev columns in DB.
3. `clearAuthCookies` clears `accessToken`, legacy `token`, `refreshToken`, `csrfToken` using **the same** Path / Secure / SameSite / Domain / Partitioned attributes used at set time, plus `Max-Age=0` / `Expires=Thu, 01 Jan 1970` rewrite for Safari.

## CSRF flow

Double-submit cookie pattern (`middleware/csrf.js`):

- Safe methods (GET/HEAD/OPTIONS): skip.
- Auth bootstrap paths (login, register, refresh, password reset, webhook, health): skip.
- No session cookies: skip (public feedback/newsletter).
- Otherwise: `csrfToken` cookie must match `X-CSRF-Token` (or `CSRF-Token`) header via `timingSafeEqual`.

## Cookie lifetimes

| Cookie | Default TTL | Source of truth |
|--------|-------------|-----------------|
| `accessToken` | 15 minutes | `ACCESS_TOKEN_EXPIRES` (cookie `maxAge` synced) |
| `refreshToken` | 7 days | `REFRESH_TOKEN_EXPIRES` |
| `csrfToken` | 7 days (refresh TTL) | Rotated on login/refresh |

JWT `expiresIn` and cookie `maxAge` share one TTL resolver in `config/security.js`.

## Cookie attributes

| Attribute | accessToken | refreshToken | csrfToken |
|-----------|-------------|--------------|-----------|
| HttpOnly | yes | yes | **no** |
| Secure | production or SameSite=None | same | same |
| SameSite | Lax (same-site) or None (cross-site) | same | same |
| Path | `/` | `/api/user` | `/` |
| Domain | omit (host-only) unless `COOKIE_DOMAIN` | same | same |
| Max-Age / Expires | access TTL | refresh TTL | refresh TTL |
| Partitioned | only when enabled for cross-site None | same | same |

## SameSite strategy

`resolveCookieSameSite()`:

1. Override: `COOKIE_SAMESITE=lax|none|strict`
2. Else compare `API_PUBLIC_ORIGIN` to each `CORS_ORIGINS` frontend (eTLD+1 heuristic).
3. Any cross-site frontend → **None** (requires Secure).
4. Else → **Lax**.

### Same-site deployment (recommended)

- Frontend: `https://shop.example.com`
- API: `https://api.example.com`
- Result: **SameSite=Lax**, no Partitioned, best Safari behavior.

### Cross-site deployment

- Frontend: `https://app.vercel.app`, API: `https://api.railway.app`
- Result: **SameSite=None; Secure**, optional **Partitioned** (CHIPS).
- Safari ITP may still block or partition third-party cookies — prefer same-site subdomains.

## Partitioned (CHIPS)

Env `COOKIE_PARTITIONED`:

| Value | Behavior |
|-------|----------|
| `auto` (default) | Partitioned only if **production** + SameSite=None + Secure |
| `true` | Partitioned whenever SameSite=None + Secure |
| `false` | Never set Partitioned |

| Browser | Behavior |
|---------|----------|
| Chrome / Edge | Honor Partitioned in third-party contexts |
| Firefox | Ignores or partial; unknown attributes ignored safely |
| Safari | Does not use CHIPS like Chromium; prefer same-site Lax |

Clearing cookies must mirror Partitioned when it was set, or deletion may fail in Chrome.

## Multi-tab behavior

- Cookie jar is shared across tabs of the same browser profile.
- Refresh rotation grace avoids accidental logout when two tabs refresh together.
- Admin clients also coordinate in-memory CSRF via `BroadcastChannel`.

## Browser compatibility

| Browser | Login | Refresh | Logout | Notes |
|---------|-------|---------|--------|-------|
| Chrome | OK | OK | OK | Full CHIPS support when Partitioned set |
| Firefox | OK | OK | OK | SameSite/Secure standard |
| Edge | OK | OK | OK | Chromium-equivalent |
| Safari | OK* | OK* | OK* | *Best on same-site Lax; cross-site None is fragile under ITP |

Local HTTP: Secure is off unless SameSite=None (then Secure is forced — use HTTPS or same-site Lax locally).

## Security considerations

- Never expose JWTs in JSON or non-HttpOnly storage.
- Distinct access vs refresh secrets in production (`runProductionChecks`).
- Refresh scoped to `/api/user` reduces leak surface on other paths.
- Account lockout (`MAX_LOGIN_FAILURES`) complements IP rate limits.
- CSRF required whenever session cookies are present on mutating routes.
- Behind a reverse proxy: set `TRUST_PROXY_HOPS` so Secure cookies and rate-limit IPs see real client / HTTPS.
- `E2E_RELAX_RATE_LIMIT` / `LOAD_TEST_BYPASS` disable rate limits — rejected at production boot.
- Local Docker Compose API is on **host port 5001** (`127.0.0.1:5001`) so it does not steal `:5000` from `npm run dev` / Playwright (see `e2e/README.md`).

## Related

- [DEPLOYMENT.md](./DEPLOYMENT.md) — HTTPS, proxy, HSTS
- `config/security.js` — cookie option builders
- `middleware/csrf.js` — CSRF middleware
- `e2e/auth-cookies.spec.mjs` — Playwright browser cookie tests

