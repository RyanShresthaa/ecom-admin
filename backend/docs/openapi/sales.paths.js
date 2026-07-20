/**
 * OpenAPI path definitions (tag: Sales). Merged by config/swagger.js.
 * @see admin/routes/sales.route.js
 */

/**
 * @openapi
 * /api/sales/quotations:
 *   post:
 *     tags: [Sales]
 *     summary: Create draft quotation (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       201: { description: Quotation created }
 *   get:
 *     tags: [Sales]
 *     summary: List quotations (scoped by role)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Quotation list }
 *
 * /api/sales/quotations/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Quotation detail + lines
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail }
 *   patch:
 *     tags: [Sales]
 *     summary: Edit draft quotation (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/sales/quotations/{id}/status:
 *   patch:
 *     tags: [Sales]
 *     summary: Transition quotation status (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Status updated }
 *
 * /api/sales/quotations/{id}/accept:
 *   post:
 *     tags: [Sales]
 *     summary: Customer accepts quotation
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Accepted }
 *
 * /api/sales/invoices/from-order/{orderId}:
 *   post:
 *     tags: [Sales]
 *     summary: Create draft formal invoice from checkout order_id (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Draft invoice }
 *
 * /api/sales/invoices/by-order/{orderId}/revise:
 *   post:
 *     tags: [Sales]
 *     summary: New draft revision after issued invoice (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Revision draft }
 *
 * /api/sales/invoices:
 *   get:
 *     tags: [Sales]
 *     summary: List sales invoices (scoped by role)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Invoice list }
 *
 * /api/sales/invoices/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sales invoice
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invoice document }
 *   patch:
 *     tags: [Sales]
 *     summary: Edit draft invoice (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *
 * /api/sales/invoices/{id}/issue:
 *   post:
 *     tags: [Sales]
 *     summary: Finalize draft invoice (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Issued }
 *
 * /api/sales/invoices/{id}/void:
 *   post:
 *     tags: [Sales]
 *     summary: Void invoice (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Voided }
 *
 * /api/sales/credit-notes:
 *   get:
 *     tags: [Sales]
 *     summary: List credit notes (scoped by role)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Credit note list }
 *
 * /api/sales/credit-notes/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get credit note
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Credit note detail }
 */

export {};
