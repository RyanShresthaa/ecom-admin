/**
 * OpenAPI path definitions (cart, orders, addresses, coupons, reviews, wishlist, returns, shop).
 * Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/cart/get:
 *   get:
 *     tags: [Cart]
 *     summary: Get cart
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Cart items }
 *
 * /api/cart/add:
 *   post:
 *     tags: [Cart]
 *     summary: Add to cart
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Added }
 *
 * /api/cart/update:
 *   put:
 *     tags: [Cart]
 *     summary: Update quantity
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/cart/delete:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove cart line
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Removed }
 *
 * /api/order/preview-checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Preview checkout totals
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutBody' }
 *     responses:
 *       200: { description: Pricing summary }
 *
 * /api/order/place-cod:
 *   post:
 *     tags: [Orders]
 *     summary: Place COD order
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKeyHeader'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutBody' }
 *     responses:
 *       200: { description: Order placed }
 *       409: { description: Idempotency conflict }
 *
 * /api/order/place-online:
 *   post:
 *     tags: [Orders]
 *     summary: Online checkout (Stripe or mock in dev)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKeyHeader'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutBody' }
 *     responses:
 *       200: { description: Order or Stripe session }
 *       503: { description: Payment not configured (production) }
 *
 * /api/order/my-orders:
 *   get:
 *     tags: [Orders]
 *     summary: My orders
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Order list }
 *
 * /api/order/invoice/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Invoice HTML
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invoice }
 *
 * /api/order/all:
 *   get:
 *     tags: [Orders]
 *     summary: All orders (Admin)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Orders }
 *
 * /api/order/update-status:
 *   put:
 *     tags: [Orders]
 *     summary: Update order status (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/address/get:
 *   get:
 *     tags: [Addresses]
 *     summary: List addresses
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Addresses }
 *
 * /api/address/add:
 *   post:
 *     tags: [Addresses]
 *     summary: Add address
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/address/update:
 *   put:
 *     tags: [Addresses]
 *     summary: Update address
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/address/delete:
 *   delete:
 *     tags: [Addresses]
 *     summary: Delete address
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/coupon/validate:
 *   post:
 *     tags: [Coupons]
 *     summary: Validate coupon (public)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: Valid }
 *       404: { description: Invalid }
 *
 * /api/coupon/list:
 *   get:
 *     tags: [Coupons]
 *     summary: List coupons (Admin)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Coupons }
 *
 * /api/coupon/create:
 *   post:
 *     tags: [Coupons]
 *     summary: Create coupon (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/coupon/{id}:
 *   delete:
 *     tags: [Coupons]
 *     summary: Delete coupon (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/review/product/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Reviews for product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reviews + summary }
 *
 * /api/review/add:
 *   post:
 *     tags: [Reviews]
 *     summary: Add review
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/review/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete own review
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/wishlist/:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get wishlist
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Items }
 *
 * /api/wishlist/add:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add to wishlist
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Added }
 *
 * /api/wishlist/remove:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove from wishlist
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Removed }
 *
 * /api/return/request:
 *   post:
 *     tags: [Returns]
 *     summary: Request return
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Requested }
 *
 * /api/return/my:
 *   get:
 *     tags: [Returns]
 *     summary: My return requests
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Returns }
 *
 * /api/return/all:
 *   get:
 *     tags: [Returns]
 *     summary: All returns (Admin)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Returns }
 *
 * /api/return/update:
 *   put:
 *     tags: [Returns]
 *     summary: Update return status (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/shop/settings:
 *   get:
 *     tags: [Shop]
 *     summary: Public shop settings
 *     responses:
 *       200: { description: Tax, shipping, currency }
 *   put:
 *     tags: [Shop]
 *     summary: Update shop settings (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/shop/settings/admin:
 *   get:
 *     tags: [Shop]
 *     summary: Full settings payload (Admin)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Settings }
 */

export {};
