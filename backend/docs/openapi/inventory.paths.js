/**
 * OpenAPI path definitions (tag: Inventory). Merged by config/swagger.js.
 * @see routes/inventory.route.js
 */

/**
 * @openapi
 * /api/inventory/warehouses:
 *   get:
 *     tags: [Inventory]
 *     summary: List warehouses
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Warehouse list }
 *   post:
 *     tags: [Inventory]
 *     summary: Create warehouse (Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/inventory/product/{productId}/breakdown:
 *   get:
 *     tags: [Inventory]
 *     summary: Stock breakdown by warehouse for a product
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Breakdown }
 *
 * /api/inventory/movements:
 *   get:
 *     tags: [Inventory]
 *     summary: Inventory movement history
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Movements }
 *
 * /api/inventory/add:
 *   post:
 *     tags: [Inventory]
 *     summary: Add stock to a warehouse line
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Stock added }
 *
 * /api/inventory/remove:
 *   post:
 *     tags: [Inventory]
 *     summary: Remove stock
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Stock removed }
 *
 * /api/inventory/transfer:
 *   post:
 *     tags: [Inventory]
 *     summary: Transfer stock between warehouses
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Transferred }
 */

export {};
