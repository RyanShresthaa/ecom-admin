/**
 * OpenAPI path definitions (Admin, Payment, Upload). Merged by config/swagger.js.
 */

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard statistics
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Counts and revenue }
 *
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [User, Seller, Admin] }
 *       - in: query
 *         name: sellerRequest
 *         schema: { type: string, enum: ['true'] }
 *     responses:
 *       200: { description: Users }
 *
 * /api/admin/seller-requests:
 *   get:
 *     tags: [Admin]
 *     summary: Pending seller applications
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Users }
 *
 * /api/admin/users/{id}/approve-seller:
 *   post:
 *     tags: [Admin]
 *     summary: Approve seller
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Approved }
 *
 * /api/admin/users/{id}/reject-seller:
 *   post:
 *     tags: [Admin]
 *     summary: Reject seller application
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Rejected }
 *
 * /api/admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Set user role
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, enum: [User, Seller, Admin] }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/admin/users/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Set user status (e.g. active, suspended)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/admin/feedback:
 *   get:
 *     tags: [Admin]
 *     summary: List customer feedback
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Feedback items }
 *
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Admin audit trail
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Logs }
 *
 * /api/admin/security-events:
 *   get:
 *     tags: [Admin]
 *     summary: Security events
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Events }
 *
 * /api/payment/create-intent:
 *   post:
 *     tags: [Payment]
 *     summary: Create payment intent
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: paymentId }
 *       503: { description: Not configured in production }
 *
 * /api/payment/verify:
 *   post:
 *     tags: [Payment]
 *     summary: Verify payment for orders
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Verified }
 *
 * /api/upload/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload image (multipart)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: URL }
 */

export {};
