/**
 * OpenAPI path definitions (tag: Purchases). Merged by config/swagger.js.
 * @see admin/routes/purchase.route.js — Nepal VAT 13%, Admin-only returns.
 */

/**
 * @openapi
 * /api/purchases/suppliers:
 *   post:
 *     tags: [Purchases]
 *     summary: Create supplier (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       201: { description: Created }
 *   get:
 *     tags: [Purchases]
 *     summary: List suppliers (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: skip
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Supplier list }
 *
 * /api/purchases/suppliers/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Supplier detail (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail }
 *   put:
 *     tags: [Purchases]
 *     summary: Update supplier (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/purchases/bills:
 *   post:
 *     tags: [Purchases]
 *     summary: Create draft purchase bill (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       201: { description: Draft bill PB-YYYY-##### }
 *   get:
 *     tags: [Purchases]
 *     summary: List purchase bills (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Bill list }
 *
 * /api/purchases/bills/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Bill detail with lines, payments, returns (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail }
 *   patch:
 *     tags: [Purchases]
 *     summary: Replace draft bill lines (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/purchases/bills/{id}/preview:
 *   get:
 *     tags: [Purchases]
 *     summary: Printable HTML preview + VAT totals (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Preview payload }
 *
 * /api/purchases/bills/{id}/receive:
 *   post:
 *     tags: [Purchases]
 *     summary: Post goods — stock in (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Received }
 *
 * /api/purchases/bills/{id}/void:
 *   post:
 *     tags: [Purchases]
 *     summary: Void draft bill (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Voided }
 *
 * /api/purchases/bills/{id}/payments:
 *   post:
 *     tags: [Purchases]
 *     summary: Record payment-out (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Payment recorded }
 *   get:
 *     tags: [Purchases]
 *     summary: List payments for bill (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payments }
 *
 * /api/purchases/bills/{id}/returns:
 *   post:
 *     tags: [Purchases]
 *     summary: Create draft purchase return (admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Return PRN-… created }
 *
 * /api/purchases/returns:
 *   get:
 *     tags: [Purchases]
 *     summary: List purchase returns (admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: billId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Returns }
 *
 * /api/purchases/returns/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Purchase return detail (admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail }
 *
 * /api/purchases/returns/{id}/approve:
 *   post:
 *     tags: [Purchases]
 *     summary: Approve return — removes stock (admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Approved }
 *
 * /api/purchases/returns/{id}/void:
 *   post:
 *     tags: [Purchases]
 *     summary: Void draft return (admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Voided }
 */

export {};
