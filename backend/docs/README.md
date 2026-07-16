# Backend — Project Documentation

PostgreSQL e-commerce REST API (Express 5, ES modules).

**Code map (where things live):** [docs/CODEMAP.md](./CODEMAP.md)

**Interactive API docs (Swagger):** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)  
**OpenAPI JSON:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

---

## CI/CD (GitHub Actions)

Workflow: [`.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)

On push/PR to `main` or `master` (when `backend/` changes):

1. Spin up PostgreSQL 16  
2. `npm ci` → **`npm run lint`** → `npm run db:migrate`  
3. `npm test` (unit + Nepal VAT + purchase DB flows when DB is up)  
4. Start server → `npm run test:api` (smoke) → **`npm run test:integration`** (validation + request ID)  

Local: `npm run lint` · `npm run format` (optional Prettier). **`npm test`** runs unit security, **Nepal VAT purchase math**, and **DB integration** (supplier + purchase bill + stock + payment-out) when PostgreSQL is reachable from `.env`; use **`SKIP_DB_TESTS=1`** to skip the DB-only tests. **`SKIP_API_TESTS=1`** applies only to `npm run test:api` / `npm run test:integration` (they need a running server).

**Production deploy** (Docker, HTTPS, backups): see [docs/DEPLOYMENT.md](./DEPLOYMENT.md).

```bash
docker compose up --build   # API + Postgres + email worker
```

---

## Request ID + validation

| Feature | Detail |
|---------|--------|
| **X-Request-Id** | Every response echoes a request ID (send your own header or server generates UUID). Included on 404/500 JSON when available. |
| **Zod bodies** | `POST /api/user/register`, `/login`, `/order/preview-checkout`, `/place`, `/place-cod`, `/place-online`, **`/api/payment/refund`**, **`/api/sales/*`**, **`/api/purchases/*`** mutations — malformed input returns **400** before controllers. |
| **Schemas** | `validation/schemas.js` — extend sparingly. |

---

## Idempotent checkout

Send header on `POST /api/order/place-cod`, `POST /api/order/place` (cash), and mock `place-online` / stripe confirm:

```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Same user + same key within 24h → same order response (no duplicate order).  
Missing header → checkout works as before.

---

## Background jobs (BullMQ + Redis)

Preferred production setup — Express enqueues jobs, workers process them asynchronously.

In `.env`:

```env
REDIS_URL=redis://localhost:6379
QUEUE_ENABLED=true
```

Run workers in a second terminal:

```bash
npm run queue:worker
```

**Queues:** email, payment-webhook, inventory, image-processing, notification, invoice, retry, analytics, cache-invalidation, scheduled (+ enterprise stubs: recommendation, fraud-detection, machine-learning, warehouse-sync, search-index).

**Monitor:** Bull Board at `/api/admin/queues` (staff login required).

**Legacy:** PostgreSQL `email_queue` still works when `EMAIL_USE_QUEUE=true` and `QUEUE_ENABLED=false` (`npm run email:worker`).

---

## Quick start

```bash
cd backend
cp .env.example .env   # fill DB, JWT secrets, SMTP, etc.
npm install
npm run db:migrate
npm run dev
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start API (default port **5000**) |
| `npm run db:migrate` | Apply SQL migrations (`db/migrations/`) |
| `npm run check:smtp` | Test email configuration |

---

## Request flow (middleware order)

Defined in `server.js`:

1. **Helmet, CORS, HPP** — HTTP security headers & origin policy (`config/security.js`)
2. **Body parser + cookies** — JSON (1MB), `cookie-parser`
3. **sanitizeInput** — trim/strip risky strings (`middleware/sanitizeInput.js`)
4. **securityRequestLogger** — suspicious pattern logging
5. **speedLimiter + apiLimiter** — rate limits (`middleware/rateLimiter.js`)
6. **csrfProtection** — CSRF when session cookies exist (`middleware/csrf.js`)
7. **Routes** — `/api/*`
8. **errorHandler** — 404 + global errors (`middleware/errorHandler.js`)

---

## Authentication & CSRF

| Cookie | Path | Purpose |
|--------|------|---------|
| `accessToken` | `/` | Short-lived JWT (~15m) |
| `refreshToken` | `/api/user` | Long-lived refresh (~7d), rotated on refresh |
| `csrfToken` | `/` | Not httpOnly — copy to header |

**After login:** send `X-CSRF-Token: <csrfToken cookie value>` on **POST / PUT / DELETE** when you have session cookies.

**CSRF not required when:** no `accessToken` / `refreshToken` cookies (public catalog POST, coupon validate).

**Exempt paths (always):** register, login, **login-pin**, google, verify-email, forgot/reset password, **forgot/reset PIN**, refresh-token, health, ready, **feedback submit** (anonymous). Paths under `/api/v1/...` share the same exemptions.

**Postman:** enable cookies; after login copy `csrfToken` → Headers → `X-CSRF-Token`.

---

## Roles

| Role | Can do |
|------|--------|
| **User** | Cart, orders, addresses, reviews, wishlist, apply-seller |
| **Seller** | User + create/edit **own** products, categories (staff) |
| **Admin** | Full catalog, all orders, users, sellers, audit, settings |

Middleware: `middleware/auth.js`, `middleware/roles.js` (`admin`, `staff`), `middleware/productOwner.js`.

---

## Folder map — what each file does

### Entry

| File | Responsibility |
|------|----------------|
| `server.js` | App bootstrap, middleware chain, `/api` + `/api/v1` mounts, health + ready |
| `package.json` | Dependencies & npm scripts |

### `config/`

| File | Responsibility |
|------|----------------|
| `connectDB.js` | PostgreSQL connection pool (`pg`) |
| `security.js` | JWT secrets, cookie options, CORS, Helmet |
| `validateEnv.js` | Startup env validation (fails fast if misconfigured) |
| `swagger.js` | OpenAPI spec + Swagger UI at `/api/docs` |
| `stripe.js` | Optional Stripe client (mock checkout if absent) |
| `sendEmail.js` | Nodemailer SMTP |
| `monitoring.js` | Optional Sentry |
| `cloudinary.js` | Image upload config |

### `routes/` → `controllers/` → `models/`

| Route prefix | Route file | Controller | Model(s) |
|--------------|------------|------------|----------|
| `/api/user` | `user.route.js` | `user.controller.js` | `user.model.js` |
| `/api/product` | `product.route.js` | `product.controller.js` | `product.model.js`, `variant.model.js` |
| `/api/category` | `category.route.js` | `category.controller.js` | `category.model.js` |
| `/api/subcategory` | `subcategory.route.js` | `subcategory.controller.js` | `subcategory.model.js` |
| `/api/cart` | `cart.route.js` | `cart.controller.js` | `cartproduct.model.js` (guest + user) |
| `/api/order` | `order.route.js` | `order.controller.js` | `order.model.js` |
| `/api/address` | `address.route.js` | `address.controller.js` | `address.model.js` |
| `/api/admin` | `admin.route.js` | `admin.controller.js` | `user`, `order`, `audit` |
| `/api/coupon` | `coupon.route.js` | `coupon.controller.js` | `coupon.model.js` |
| `/api/review` | `review.route.js` | `review.controller.js` | `review.model.js` |
| `/api/wishlist` | `wishlist.route.js` | `wishlist.controller.js` | `wishlist.model.js` |
| `/api/return` | `return.route.js` | `return.controller.js` | `return.model.js` |
| `/api/sales` | `sales.route.js` | `sales.controller.js` | `sales.model.js`, `order.model.js` |
| `/api/purchases` | `purchase.route.js` | `purchase.controller.js` | `purchase.model.js`, `settings.model.js` |
| `/api/shop` | `shop.route.js` | `settings.controller.js` | `settings.model.js` |
| `/api/payment` | `payment.route.js` | `payment.controller.js`, `refund.controller.js` | `refund.model.js`, `services/payments/*` |
| `/api/upload` | `upload.route.js` | (inline) | Cloudinary util |

### `middleware/`

| File | When to look here |
|------|-------------------|
| `auth.js` | 401, token invalid, account inactive |
| `csrf.js` | 403 Invalid CSRF |
| `rateLimiter.js` | 429 Too many requests |
| `abuseGuard.js` | 423 account locked, failed logins |
| `captcha.js` | captchaToken required (if reCAPTCHA enabled) |
| `sanitizeInput.js` | Express 5 query/body issues |
| `roles.js` | 403 Permission denied (wrong role) |
| `productOwner.js` | Seller editing another seller's product |
| `multer.js` | Avatar / upload file errors |
| `errorHandler.js` | Unhandled 500s, 404 routes |

### `utils/` (business logic)

| File | Responsibility |
|------|----------------|
| `checkout.js` | Resolve cart/items, stock checks, coupon |
| `pricing.js` | Tax, shipping, coupon math |
| `placeOrder.js` | Insert orders + stock transaction + invoice |
| `orderStock.js` | `decrementStock`, `restoreStock` (cancel/return) |
| `orderEmails.js` | Order confirm / status / low-stock emails |
| `invoice.js` | Invoice HTML for orders |
| `salesDocumentRender.js` | Formal quotation / invoice / credit note HTML |
| `salesFromOrder.js` | Issuable invoice payload from shared `order_id` |
| `salesCreditFromReturn.js` | Credit note when admin approves a return |
| `nepalVat.js` | Nepal purchase VAT **13%** (taxable value excl. VAT + line VAT) |
| `purchaseDocumentRender.js` | Purchase bill & purchase return printable HTML |
| `generateAccessToken.js` / `generatedRefreshToken.js` | JWT issue + DB refresh storage |
| `password.js` | Password strength rules |
| `logger.js` | Structured logging |
| `requestMeta.js` | Client IP / User-Agent for audit |

### `db/migrations/`

| File | Adds |
|------|------|
| `001_schema.sql` | Core tables (users, products, orders, cart, …) |
| `002_alter_legacy.sql` | Legacy column fixes |
| `003_verify_email_token.sql` | Email verification |
| `004_seller_request.sql` | Seller application flag |
| `005_ecommerce_features.sql` | Coupons, reviews, wishlist, settings, returns, audit |
| `006_security_hardening.sql` | Lockout, security_events, shop_settings |
| `007_idempotency_email_queue.sql` | Checkout idempotency + email queue |
| `008_mobile_pin_feedback_deactivate.sql` | Mobile PIN, feedback, account deactivate |
| `009_inventory_warehouses.sql` | Warehouses, per-location stock, stock_movements |
| `010_sales_documents.sql` | Quotations, revisioned `sales_invoices`, `credit_notes`, `doc_counters`; fixes `orders.order_id` uniqueness for multi-line carts |
| `011_nepal_purchase_vat.sql` | Suppliers, Nepal VAT **13%** purchase bills (NPR), payment-out, purchase returns; `shop_settings`: `tax_region`, `vat_standard_rate`, `purchase_default_currency`, `company_vat_pan`, `company_legal_name` |

### `scripts/`

| File | Purpose |
|------|---------|
| `migrate.mjs` | Runs all migrations in order |
| `check-smtp.mjs` | Verify SMTP credentials |

---

## API route index (summary)

Full detail in Swagger. Base: `http://localhost:5000`

### Auth — `/api/user`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/register` | No | Verify email before login |
| POST | `/verify-email` | No | Body: `{ code }` |
| POST | `/login` | No | Sets cookies |
| POST | `/google` | No | Body: `{ credential }` |
| POST | `/logout` | Yes + CSRF | |
| POST | `/refresh-token` | Cookie | CSRF exempt |
| GET | `/csrf` | Yes | New CSRF token |
| GET | `/user-details` | Yes | |
| POST | `/apply-seller` | Yes + CSRF | |
| GET | `/export-account` | Yes | |
| DELETE | `/delete-account` | Yes + CSRF | `confirm: "DELETE"` |
| POST | `/deactivate-account` | Yes + CSRF | `confirm: "DEACTIVATE"`; soft `status: Inactive` |
| POST | `/login-pin` | No | Email + PIN (CAPTCHA); requires prior `setup-pin` |
| POST | `/setup-pin` | Yes + CSRF | First PIN; password accounts need `password` |
| POST | `/change-pin` | Yes + CSRF | `currentPin`, `pin`, `confirmPin` |
| PUT/POST | `/forgot-pin` | No | Email OTP (rate limited) |
| PUT/POST | `/verify-forgot-pin-otp` | No | Then `reset-pin` |
| PUT/POST | `/reset-pin` | No | After OTP verify |

### Feedback — `/api/feedback`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/submit` | Optional | `targetType`: `product` \| `seller` \| `business`; CSRF if logged in |

### Inventory — `/api/inventory` (Staff: Admin + Seller; sellers own SKUs only)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/warehouses` | Staff | Fulfillment locations |
| POST | `/warehouses` | Admin | `{ code, name }` — secondary DC/store |
| GET | `/product/:productId/breakdown` | Staff | Per-warehouse quantities + total |
| GET | `/movements` | Staff | Sellers: `?productId=` required; optional `limit`/`skip` |
| POST | `/add` | Staff + CSRF | Receipt / PO: `productId`, `quantity`, optional `warehouseId`, `reason`, `note` |
| POST | `/remove` | Staff + CSRF | Shrink / damage: same shape |
| POST | `/transfer` | Staff + CSRF | `fromWarehouseId`, `toWarehouseId`, `productId`, `quantity`, optional `note` |

### Sales — `/api/sales` (quotations, formal invoices, credit notes)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/quotations` | Staff | Create draft quotation + lines (`salesQuotationCreateBodySchema`) |
| GET | `/quotations` | Yes | Seller: own drafts; User: assigned customer; Admin: all |
| GET | `/quotations/:id` | Yes | Detail + lines if permitted |
| PATCH | `/quotations/:id` | Staff | Edit draft (lines / tax / shipping / notes) |
| PATCH | `/quotations/:id/status` | Staff | `sent`, `declined`, `void`, … |
| POST | `/quotations/:id/accept` | User | Customer accepts when `customer_user_id` matches |
| POST | `/invoices/from-order/:orderId` | Staff | New **draft** formal invoice from checkout `order_id` |
| POST | `/invoices/by-order/:orderId/revise` | Staff | New draft revision after an **issued** invoice |
| GET | `/invoices` | Yes | Buyer: own; Seller: orders with their SKUs; Admin: all |
| GET | `/invoices/:id` | Yes | Issued/draft/void document |
| PATCH | `/invoices/:id` | Staff | Draft: `html_body` and/or `regenerate: true` |
| POST | `/invoices/:id/issue` | Staff | Finalize draft (voids other drafts for same order) |
| POST | `/invoices/:id/void` | Staff | |
| GET | `/credit-notes` | Yes | Scoped like invoices |
| GET | `/credit-notes/:id` | Yes | Includes `related_invoice` when linked |

Approved returns (`PUT /api/return/update`) also enqueue an idempotent **credit note** (`CRN-…`) when possible.

### Purchases — `/api/purchases` (**Admin only**; Nepal VAT **13%**, default currency **NPR**)

VAT formula: **line net (excl. VAT)** = qty × unit price excl. VAT; **VAT** = net × (vatRate/100), default rate **13%**; **gross** = net + VAT. Set buyer PAN / legal name via Admin → `shop_settings` keys `company_vat_pan`, `company_legal_name` (or override on each bill).

| Method | Path | Notes |
|--------|------|--------|
| POST | `/suppliers` | Create supplier (`vatPan`, address, …) |
| GET | `/suppliers` | List (`?search=`, `limit`, `skip`) |
| GET | `/suppliers/:id` | Detail |
| PUT | `/suppliers/:id` | Update |
| POST | `/bills` | Draft bill `{ supplierId, billDate?, … }` → `PB-YYYY-#####` |
| GET | `/bills` | List (`?status=`, `?supplierId=`) |
| GET | `/bills/:id` | **Bill details**: lines, **payments** (payment-out list), **returns** |
| GET | `/bills/:id/preview` | **Preview**: `html`, lines, totals, `vatStandardRatePercent: 13`, `balanceDue` |
| PATCH | `/bills/:id` | Replace lines (draft only); each line: `quantity`, `unitPriceExclVat`, optional `vatRate` (0–100, default 13), optional `productId` / `description` |
| POST | `/bills/:id/receive` | Post goods: **stock in** default warehouse (or `warehouse_id` on bill), freeze supplier snapshot |
| POST | `/bills/:id/void` | Draft only |
| POST | `/bills/:id/payments` | **Payment out** `{ amount, method?, reference?, paidAt? }`; status → `partial_paid` / `paid` |
| GET | `/bills/:id/payments` | List payments |
| GET | `/returns?billId=` | List returns for a bill |
| POST | `/bills/:id/returns` | Draft purchase return `{ lines: [{ purchaseBillLineId, quantity }], reason? }` → `PRN-…` |
| GET | `/returns/:id` | **Return details** + lines + parent bill |
| POST | `/returns/:id/approve` | **Approve**: removes stock for lines with `product_id` |
| POST | `/returns/:id/void` | Draft only |

### Orders — `/api/order`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/preview-checkout` | `{ addressId, useCart?, couponCode?, list_items? }` |
| POST | `/place` | `{ paymentMethod: "cash"\|"stripe", addressId, … }` — cash places order; stripe returns Checkout `url` |
| POST | `/place-cod` | Alias of cash |
| POST | `/place-online` | Alias of stripe |
| POST | `/confirm-stripe` | `{ sessionId }` after Stripe redirect — creates paid order |
| POST | `/reorder` | `{ orderGroupId }` — copy past order into cart |
| GET | `/delivery-statuses` | Staff: FSM statuses + carriers |
| PUT | `/tracking` | Staff: `{ orderGroupId, tracking_number, carrier }` |
| PUT | `/update-status` | Staff: FSM delivery + payment; optional tracking |
| GET | `/my-orders` | |
| GET | `/invoice/:id` | |

### Shipping — `/api/shop/shipping`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/zones` | Staff list zones + rates |
| POST | `/zones` | Create zone (`match_type`: city/state/country/default) |
| PUT/DELETE | `/zones` | Update / delete zone |
| POST/PUT/DELETE | `/rates` | Zone rates (`rate`, `free_min`) |
| POST | `/quote` | `{ city, state, country, subtotal }` → fee |

Checkout uses zones when `addressId` is provided (else shop flat fee).

### Scale / marketplace — feature-flagged

Enable via `PUT /api/flags` `{ "key": "mfa", "enabled": true }` (Admin).

| Prefix | Feature |
|--------|---------|
| `/api/flags` | Feature flags |
| `/api/mfa` | TOTP enroll/disable; login uses `/api/user/mfa-verify` |
| `/api/fx` | FX rates + convert |
| `/api/loyalty` | Points balance / redeem |
| `/api/recommendations` | Related products |
| `/api/reservations` | Stock holds |
| `/api/seller` | Earnings + payouts |
| `/api/push` | Device tokens + stub send |

Migration: `017_scale_features.sql`.

### Cart — `/api/cart` (Phase 4)

Guest or logged-in. Anonymous clients use `X-Guest-Id` header or `guest_id` cookie (auto-minted).

| Method | Path | Notes |
|--------|------|-------|
| POST | `/add` | `{ productId, variantId?, quantity? }` |
| GET | `/get` | Cart lines |
| PUT | `/update` | `{ _id, quantity }` |
| DELETE | `/delete` | `{ _id }` |
| POST | `/validate` | `{ autofix?: true }` — stock/publish check |
| POST | `/purge-expired` | Staff: delete expired guest carts |

On login, guest cart merges into the user cart automatically. Guest lines expire after `GUEST_CART_TTL_DAYS` (default 14). Product search uses Postgres FTS (`search` query param).

### Production hardening (Phase 5)

| Piece | Notes |
|-------|--------|
| Optional Redis | Set `REDIS_URL` for shared cache + rate limits; omit for in-memory (single instance) |
| `/api/ready` | Readiness: DB required; Redis only if `REDIS_REQUIRED=true` |
| `/api/v1` | Alias of `/api` (same routers) |
| CI | `.github/workflows/backend-ci.yml` — lint + unit tests |
| Docker | `docker-compose.yml` includes Redis; API gets `REDIS_URL=redis://redis:6379` |

### Payment / refunds — `/api/payment`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/create-intent` | Mock intent (dev) |
| POST | `/verify` | Mock verify |
| POST | `/refund` | Staff: full/partial **manual** refund ledger (+ stock + credit note). Stripe provider → 501 until keys exist |
| GET | `/refunds` | List (`?orderRowId=` / `?orderId=`) |
| GET | `/refunds/:id` | One refund |
| GET | `/refunds/by-order-row/:orderRowId` | Refunds for one order line |

Run migration `014_payment_refunds.sql` before using refunds.

### Admin — `/api/admin`

| Method | Path |
|--------|------|
| GET | `/stats` |
| GET | `/users` |
| GET | `/seller-requests` |
| POST | `/users/:id/approve-seller` |
| POST | `/users/:id/reject-seller` |
| PUT | `/users/:id/role` |
| PUT | `/users/:id/status` | `{ "status": "Active" \| "Inactive" }` — reactivate self-service deactivated users |
| GET | `/feedback` | `?targetType=&limit=&skip=` |
| GET | `/audit-logs` |
| GET | `/security-events` |

---

## Troubleshooting — symptom → where to look

### Server won't start

| Check | File / action |
|-------|----------------|
| Missing DB or JWT env | `.env`, `config/validateEnv.js` |
| Postgres not running | `DB_HOST`, `DB_PORT`, `DB_NAME` in `.env` |
| Port in use | Change `PORT` in `.env` |

### `503` on `/api/health`

| Check | File / action |
|-------|----------------|
| Database down / wrong credentials | `config/connectDB.js`, `.env` |
| Migrations not run | `npm run db:migrate` |

### `401 Not authorized`

| Check | File / action |
|-------|----------------|
| No cookie / expired access token | Login again or `POST /api/user/refresh-token` |
| Email not verified | `user.controller.js` login, verify via `/verify-email` |
| Account inactive | `users.status` in DB |

### `403 Invalid or missing CSRF token`

| Check | File / action |
|-------|----------------|
| Logged in but no header | Add `X-CSRF-Token` from `csrfToken` cookie |
| Stale CSRF after refresh | `GET /api/user/csrf` or use new token from login/refresh body |
| Path should be exempt? | `middleware/csrf.js` → `EXEMPT_PATHS` |

### `403 Permission denied`

| Check | File / action |
|-------|----------------|
| Need Admin | Promote user: `PUT /api/admin/users/:id/role` `{ "role": "Admin" }` |
| Need Seller for products | Approve seller flow |
| Seller wrong product | `middleware/productOwner.js` |

### `423 Account temporarily locked`

| Check | File / action |
|-------|----------------|
| Too many failed logins | `middleware/abuseGuard.js`, wait `LOCKOUT_MINUTES` |
| Clear lock in DB | `users.locked_until`, `failed_login_attempts` |

### `429 Too many requests`

| Check | File / action |
|-------|----------------|
| Rate limits | `middleware/rateLimiter.js`, env `RATE_LIMIT_*` |

### Login works but emails don't send

| Check | File / action |
|-------|----------------|
| SMTP config | `.env` SMTP_*, `npm run check:smtp` |
| Register verify link empty | Set `FRONTEND_URL` or `CLIENT_URL` in `.env` |

### Checkout / stock errors

| Check | File / action |
|-------|----------------|
| Cart empty | `utils/checkout.js`, send `useCart: true` |
| Preview ≠ checkout totals | Both need same `useCart` / `list_items` |
| Insufficient stock | `products.stock`, `utils/placeOrder.js` |
| Coupon invalid | `models/coupon.model.js`, dates/uses |

### Order cancelled — stock not restored

| Check | File / action |
|-------|----------------|
| Status update | `order.controller.js` `updateOrderStatusController` |
| Stock restore | `utils/orderStock.js` `restoreStock` |

### Google sign-in unavailable

| Check | File / action |
|-------|----------------|
| `GOOGLE_CLIENT_ID` or `CLIENT_ID` | `.env`, `user.controller.js` |

### Cloudinary / avatar upload fails

| Check | File / action |
|-------|----------------|
| Cloudinary env vars | `.env`, `utils/uploadImageCloudinary.js` |
| Multipart field name | `avatar` in `user.route.js` |

### CORS errors from frontend

| Check | File / action |
|-------|----------------|
| Origin not allowed | `CORS_ORIGINS` or `CLIENT_URL` in `.env` |
| Credentials | Frontend must send `credentials: 'include'` |

### Migration errors

| Check | File / action |
|-------|----------------|
| Legacy DB missing columns | `002_alter_legacy.sql`, `005_ecommerce_features.sql` |
| Re-run safe | `npm run db:migrate` (idempotent SQL) |

---

## Hardening (recent)

| Feature | Detail |
|---------|--------|
| Stock checkout | `SELECT FOR UPDATE` + decrement in one transaction |
| Coupons | `incrementCouponUseInTransaction` at checkout (max_uses enforced) |
| Mock payments | Disabled in `NODE_ENV=production` unless `ALLOW_MOCK_PAYMENT=true` |
| OTP | `crypto.randomInt` (6 digits) |
| Passwords | Upper, lower, number, min length |
| Verify email | Rate limited (`RATE_LIMIT_VERIFY_EMAIL`) |
| Admin revenue | `SUM(line_total)`; order count uses distinct `order_id` |
| Tests | `npm test` (security + VAT math + DB purchase flows), `npm run test:api` (server smoke) |
| CI/CD | GitHub Actions `.github/workflows/backend-ci.yml` |
| Idempotent checkout | Header `Idempotency-Key` on `place-cod` / mock `place-online` |
| Background jobs | `QUEUE_ENABLED=true` + `REDIS_URL` + `npm run queue:worker` |
| Email (legacy PG) | `EMAIL_USE_QUEUE=true` + `npm run email:worker` (when BullMQ off) |

---

## Environment variables

See `.env.example` for the full list. Critical:

- `DB_*` — PostgreSQL
- `SECRET_KEY_ACCESS_TOKEN` / `SECRET_KEY_REFRESH_TOKEN` — different random strings (32+ chars)
- `CLIENT_URL` / `CORS_ORIGINS` — frontend origin(s)
- `SMTP_*` — transactional email
- Optional: `RECAPTCHA_SECRET_KEY`, `SENTRY_DSN`, `STRIPE_SECRET_KEY`, Cloudinary
- `ALLOW_MOCK_PAYMENT=true` — only if you need mock online pay in production (dev: automatic)

---

## Features implemented

- Auth: register, verify email, login, **login-pin**, Google, refresh rotation, lockout, forgot password
- **Mobile PIN:** setup, change, forgot + OTP + reset (4–6 digits, `MOBILE_PIN_MIN` / `MOBILE_PIN_MAX`)
- **Account:** export, delete, **self deactivate** (`Inactive`); admin can set `Active` again
- **Feedback:** product / seller / business (`POST /api/feedback/submit`); admin lists `GET /api/admin/feedback`
- CSRF (session-aware), rate limits, Helmet, input sanitization
- **Inventory:** multi-warehouse rows + movement log; **add / remove / transfer** APIs; checkout decrements **default warehouse first** then others; returns restore to **default** DC
- Cart, addresses, server-side checkout (tax, shipping, coupons)
- Orders: COD, mock online, invoices, status emails, stock decrement/restore
- Reviews, wishlist, returns, shop settings
- Admin: users, seller approval, dashboard, audit logs, security events
- Account export / delete / **deactivate**
- **Not included:** production payment gateway wiring, frontend app

---

## Seller workflow

1. User: `POST /api/user/apply-seller`
2. Admin: `GET /api/admin/seller-requests`
3. Admin: `POST /api/admin/users/:id/approve-seller`  
   Or: `PUT /api/admin/users/:id/role` with `{ "role": "Seller" }`

---

## Security event & audit logs

- Admin: `GET /api/admin/audit-logs` — admin actions (`models/audit.model.js`)
- Admin: `GET /api/admin/security-events` — auth failures, CSRF blocks, etc. (`models/securityEvent.model.js`)

---

*Last updated for backend v1.0 — use Swagger UI for request/response exploration.*
