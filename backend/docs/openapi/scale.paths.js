/**
 * OpenAPI path definitions (Scale / marketplace — feature-flag gated).
 * Merged by config/swagger.js.
 * @see customer/routes/scale.route.js
 */

/**
 * @openapi
 * /api/flags:
 *   get:
 *     tags: [Scale]
 *     summary: List feature flags (staff)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Flags }
 *   put:
 *     tags: [Scale]
 *     summary: Set feature flag (admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, enabled]
 *             properties:
 *               key: { type: string }
 *               enabled: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/mfa/status:
 *   get:
 *     tags: [Scale]
 *     summary: MFA enrollment status
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Status }
 *
 * /api/mfa/begin:
 *   post:
 *     tags: [Scale]
 *     summary: Begin TOTP enrollment
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: QR / secret }
 *
 * /api/mfa/confirm:
 *   post:
 *     tags: [Scale]
 *     summary: Confirm TOTP code
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Enabled }
 *
 * /api/mfa/disable:
 *   post:
 *     tags: [Scale]
 *     summary: Disable MFA
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Disabled }
 *
 * /api/fx/rates:
 *   get:
 *     tags: [Scale]
 *     summary: List FX rates (public)
 *     responses:
 *       200: { description: Rates }
 *   put:
 *     tags: [Scale]
 *     summary: Upsert FX rate (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/fx/convert:
 *   post:
 *     tags: [Scale]
 *     summary: Convert amount between currencies
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from: { type: string }
 *               to: { type: string }
 *               amount: { type: number }
 *     responses:
 *       200: { description: Converted amount }
 *
 * /api/loyalty/me:
 *   get:
 *     tags: [Scale]
 *     summary: My loyalty balance
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Balance }
 *
 * /api/loyalty/ledger:
 *   get:
 *     tags: [Scale]
 *     summary: My loyalty ledger
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Entries }
 *
 * /api/loyalty/redeem:
 *   post:
 *     tags: [Scale]
 *     summary: Redeem loyalty points
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Redeemed }
 *
 * /api/loyalty/adjust:
 *   post:
 *     tags: [Scale]
 *     summary: Admin adjust points
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Adjusted }
 *
 * /api/recommendations/product/{productId}:
 *   get:
 *     tags: [Scale]
 *     summary: Related products (public)
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Related list }
 *
 * /api/recommendations/related:
 *   post:
 *     tags: [Scale]
 *     summary: Set related product link (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Linked }
 *   delete:
 *     tags: [Scale]
 *     summary: Remove related product link (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Removed }
 *
 * /api/reservations/reserve:
 *   post:
 *     tags: [Scale]
 *     summary: Reserve stock hold
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Reserved }
 *
 * /api/reservations/release:
 *   post:
 *     tags: [Scale]
 *     summary: Release reservation
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Released }
 *
 * /api/reservations/mine:
 *   get:
 *     tags: [Scale]
 *     summary: My active reservations
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Reservations }
 *
 * /api/reservations/expire:
 *   post:
 *     tags: [Scale]
 *     summary: Expire stale reservations (staff job)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Expired count }
 *
 * /api/seller/balance:
 *   get:
 *     tags: [Scale]
 *     summary: Seller balance (staff)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Balance }
 *
 * /api/seller/earnings:
 *   get:
 *     tags: [Scale]
 *     summary: Seller earnings (staff)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Earnings }
 *
 * /api/seller/payouts:
 *   get:
 *     tags: [Scale]
 *     summary: List payouts (staff)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Payouts }
 *   post:
 *     tags: [Scale]
 *     summary: Create payout (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       201: { description: Created }
 *
 * /api/push/devices:
 *   post:
 *     tags: [Scale]
 *     summary: Register push device token
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Registered }
 *   get:
 *     tags: [Scale]
 *     summary: List my devices
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Devices }
 *   delete:
 *     tags: [Scale]
 *     summary: Unregister device token
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Removed }
 *
 * /api/push/send:
 *   post:
 *     tags: [Scale]
 *     summary: Send push notification (staff; stub without FCM keys)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Queued or stubbed }
 */

export {};
