/**
 * OpenAPI path definitions (cart, orders, addresses, coupons, reviews, wishlist, returns, shop).
 * Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/cart/get:
 *   get:
 *     tags: [Cart]
 *     summary: Get cart (auth or guest via X-Guest-Id)
 *     parameters:
 *       - in: header
 *         name: X-Guest-Id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Cart items }
 *
 * /api/cart/add:
 *   post:
 *     tags: [Cart]
 *     summary: Add to cart (guest or logged-in)
 *     responses:
 *       200: { description: Added }
 *
 * /api/cart/update:
 *   put:
 *     tags: [Cart]
 *     summary: Update quantity
 *     responses:
 *       200: { description: Updated }
 *
 * /api/cart/delete:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove cart line
 *     responses:
 *       200: { description: Removed }
 *
 * /api/cart/validate:
 *   post:
 *     tags: [Cart]
 *     summary: Validate stock/publish; body.autofix optional
 *     responses:
 *       200: { description: Validation result }
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
 * /api/order/place:
 *   post:
 *     tags: [Orders]
 *     summary: Place order with paymentMethod cash or stripe
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKeyHeader'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/CheckoutBody'
 *               - type: object
 *                 required: [paymentMethod]
 *                 properties:
 *                   paymentMethod:
 *                     type: string
 *                     enum: [cash, stripe]
 *     responses:
 *       200: { description: Order placed (cash) or Stripe session (stripe) }
 *       409: { description: Idempotency conflict }
 *       503: { description: Stripe not configured (production) }
 *
 * /api/order/place-cod:
 *   post:
 *     tags: [Orders]
 *     summary: Place cash / COD order (alias of paymentMethod=cash)
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
 *     summary: Stripe checkout (alias of paymentMethod=stripe)
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
 * /api/order/confirm-stripe:
 *   post:
 *     tags: [Orders]
 *     summary: Confirm paid Stripe Checkout session and create order
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId: { type: string }
 *     responses:
 *       200: { description: Order created or already confirmed }
 *       402: { description: Payment not completed }
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
 *     summary: Update order status (FSM-validated delivery + optional tracking)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Illegal delivery transition }
 *
 * /api/order/delivery-statuses:
 *   get:
 *     tags: [Orders]
 *     summary: List delivery lifecycle statuses + carriers
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Status list }
 *
 * /api/order/tracking:
 *   put:
 *     tags: [Orders]
 *     summary: Set tracking number/carrier on an order group
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Tracking updated }
 *
 * /api/order/reorder:
 *   post:
 *     tags: [Orders]
 *     summary: Re-add a past order to the cart
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Cart updated }
 *
 * /api/shop/shipping/zones:
 *   get:
 *     tags: [Shop]
 *     summary: List shipping zones + rates (staff)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Zones }
 *
 * /api/shop/shipping/quote:
 *   post:
 *     tags: [Shop]
 *     summary: Quote shipping for city/state/country + subtotal
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Quote }
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
