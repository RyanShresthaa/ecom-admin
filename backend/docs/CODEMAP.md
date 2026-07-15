# Code map — what each file does

Quick reference. For HTTP details use **Swagger** at `/api/docs`.

## Entry

| File | Role |
|------|------|
| `server.js` | Express app, global middleware, mounts routers, `/api/health` |

## `config/`

| File | Role |
|------|------|
| `connectDB.js` | `pg` pool |
| `security.js` | JWT secrets, cookies, CORS, Helmet |
| `validateEnv.js` | Fail fast if DB/JWT missing; production CORS check |
| `production.js` | Extra warnings when `NODE_ENV=production` |
| `payments.js` | When mock pay is allowed |
| `sendEmail.js` | SMTP transport; queue vs inline send |
| `stripe.js` | Optional Stripe client |
| `monitoring.js` | Sentry init + `captureException` |
| `swagger.js` | Builds OpenAPI + serves `/api/docs` |
| `swaggerDefinition.js` | Shared OpenAPI info/tags/schemas |

## `routes/` → `controllers/`

| Route file | Prefix | Controller |
|------------|--------|--------------|
| `user.route.js` | `/api/user` | `user.controller.js` |
| `product.route.js` | `/api/product` | `product.controller.js` |
| `category.route.js` | `/api/category` | `category.controller.js` |
| `subcategory.route.js` | `/api/subcategory` | `subcategory.controller.js` |
| `cart.route.js` | `/api/cart` | `cart.controller.js` |
| `order.route.js` | `/api/order` | `order.controller.js` |
| `address.route.js` | `/api/address` | `address.controller.js` |
| `admin.route.js` | `/api/admin` | `admin.controller.js` |
| `payment.route.js` | `/api/payment` | `payment.controller.js` |
| `upload.route.js` | `/api/upload` | `uploadImage.controller.js` |
| `coupon.route.js` | `/api/coupon` | `coupon.controller.js` |
| `review.route.js` | `/api/review` | `review.controller.js` |
| `wishlist.route.js` | `/api/wishlist` | `wishlist.controller.js` |
| `return.route.js` | `/api/return` | `return.controller.js` |
| `shop.route.js` | `/api/shop` | `settings.controller.js` |
| `feedback.route.js` | `/api/feedback` | `feedback.controller.js` |
| `inventory.route.js` | `/api/inventory` | `inventory.controller.js` |
| `sales.route.js` | `/api/sales` | `sales.controller.js` |
| `purchase.route.js` | `/api/purchases` | `purchase.controller.js` |

## `models/` (PostgreSQL)

| File | Main entities |
|------|-----------------|
| `user.model.js` | `users` |
| `product.model.js` | `products` + list/search |
| `category.model.js` | `categories` |
| `subCategory.model.js` | `subcategories` |
| `cartproduct.model.js` | `cart_items` |
| `order.model.js` | `orders` |
| `address.model.js` | `addresses` |
| `coupon.model.js` | `coupons` |
| `review.model.js` | `reviews` |
| `wishlist.model.js` | `wishlist_items` |
| `return.model.js` | `order_returns` |
| `settings.model.js` | `shop_settings` |
| `audit.model.js` | `audit_logs` |
| `securityEvent.model.js` | `security_events` |
| `idempotency.model.js` | `checkout_idempotency` |
| `emailQueue.model.js` | `email_queue` |
| `feedback.model.js` | `feedback` |
| `inventory.model.js` | `warehouses`, `warehouse_stock`, `stock_movements` |
| `sales.model.js` | `doc_counters`, `quotations`, `sales_invoices`, `credit_notes` |
| `purchase.model.js` | `suppliers`, `purchase_bills`, `purchase_bill_lines`, `purchase_payments`, `purchase_returns` |

## `middleware/`

| File | Role |
|------|------|
| `auth.js` | JWT from cookie/header → `req.userId` |
| `optionalAuth.js` | Sets `req.userId` when a valid access token exists (no 401) |
| `csrf.js` | Double-submit cookie + header when session exists |
| `validate.js` | `validateBody(zodSchema)` |
| `rateLimiter.js` | express-rate-limit + slow-down |
| `roles.js` | `admin` / `staff` role gates |
| `productOwner.js` | Seller can only touch own products |
| `abuseGuard.js` | Login lockout + failure recording |
| `captcha.js` | Optional reCAPTCHA |
| `sanitizeInput.js` | Strip risky keys from body/query |
| `securityLogger.js` | Log 429 patterns |
| `requestId.js` | `X-Request-Id` |
| `multer.js` / `multerError.js` | Multipart uploads |
| `errorHandler.js` | 404 + global 500 |

## `utils/`

| File | Role |
|------|------|
| `sql.js` | `mapRow`, `pickId`, `mapRows` |
| `checkout.js` | Resolve cart/lines + stock checks for pricing |
| `pricing.js` | Tax, shipping, coupon math |
| `placeOrder.js` | Transaction: **multi-warehouse** stock decrement, order inserts, invoice HTML |
| `orderStock.js` | Re-exports `decrementStock` / `restoreStock` from `inventoryStock.js` |
| `inventoryStock.js` | Add/remove/transfer, checkout FIFO, restore to default warehouse |
| `checkoutIdempotency.js` | `Idempotency-Key` wrapper |
| `emailQueue.js` | Queue vs direct SMTP |
| `orderEmails.js` | Order / status / low-stock templates + send |
| `invoice.js` | Invoice HTML payload |
| `salesDocumentRender.js` | Printable HTML: quotations, formal invoices, credit notes |
| `salesFromOrder.js` | Order group rows → invoice totals + HTML |
| `nepalVat.js` | Nepal purchase VAT 13% line math (`purchaseLineAmounts`) |
| `purchaseDocumentRender.js` | Purchase bill / purchase return HTML |
| `logger.js` | JSON / pretty logs |
| `requestMeta.js` | IP + User-Agent for audit |
| `password.js` | Strength rules |
| `pin.js` | Mobile PIN digit length rules (`MOBILE_PIN_MIN` / `MOBILE_PIN_MAX`) |
| `generateOtp.js` | Reset OTP |
| `generateAccessToken.js` / `generatedRefreshToken.js` | JWT issue + refresh in DB |
| `verifyEmailTemplate.js` / `forgotPasswordTemplate.js` | Email HTML |
| `uploadImageCloudinary.js` | Cloudinary upload |
| `stockAlerts.js` | Low-stock email trigger |

## `validation/`

| File | Role |
|------|------|
| `schemas.js` | Zod: register, login, checkout, PIN, feedback, admin status, **inventory**, **sales**, **purchases (Nepal VAT)** |

## `db/migrations/`

Numbered SQL — run via `npm run db:migrate`. Includes `008_*` (PIN/feedback), `009_inventory_warehouses.sql`, **`010_sales_documents.sql`** (sales docs + `doc_counters`; fixes `orders.order_id` uniqueness for multi-line carts), **`011_nepal_purchase_vat.sql`** (suppliers, Nepal VAT purchase bills @ 13%, payment-out, purchase returns; `shop_settings` keys for NP / NPR / company PAN).

## `scripts/`

| File | Role |
|------|------|
| `migrate.mjs` | Apply all migrations |
| `backup-db.mjs` | `pg_dump` |
| `email-worker.mjs` | Drain `email_queue` |
| `check-smtp.mjs` | SMTP verify |
| `*.test.mjs` | Node test runner |

## `docs/openapi/`

OpenAPI path fragments merged into Swagger (see `config/swagger.js`).
