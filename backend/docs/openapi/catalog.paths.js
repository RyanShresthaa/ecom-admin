/**
 * OpenAPI path definitions (Products, Categories, Subcategories). Merged by config/swagger.js.
 * @see routes/product.route.js, category.route.js, subcategory.route.js
 */

/**
 * @openapi
 * /api/product/get-product:
 *   get:
 *     tags: [Products]
 *     summary: List/search products (query params)
 *     responses:
 *       200: { description: Product list }
 *
 * /api/product/get-product/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product }
 *
 * /api/product/add-product:
 *   post:
 *     tags: [Products]
 *     summary: Create product (Admin/Seller)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/product/update-product:
 *   put:
 *     tags: [Products]
 *     summary: Update product (owner or Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/product/delete-product:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/category/get-category:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     responses:
 *       200: { description: Categories }
 *
 * /api/category/add-category:
 *   post:
 *     tags: [Categories]
 *     summary: Add category (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/category/update-category:
 *   put:
 *     tags: [Categories]
 *     summary: Update category (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/category/delete-category:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete category (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/subcategory/get-subcategory:
 *   get:
 *     tags: [Subcategories]
 *     summary: List subcategories
 *     responses:
 *       200: { description: Subcategories }
 *
 * /api/subcategory/add-subcategory:
 *   post:
 *     tags: [Subcategories]
 *     summary: Add subcategory (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/subcategory/update-subcategory:
 *   put:
 *     tags: [Subcategories]
 *     summary: Update subcategory (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/subcategory/delete-subcategory:
 *   delete:
 *     tags: [Subcategories]
 *     summary: Delete subcategory (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/product/create:
 *   post:
 *     tags: [Products]
 *     summary: Create product (alias of add-product)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Created }
 *
 * /api/product/get:
 *   post:
 *     tags: [Products]
 *     summary: List/search products (POST body or filters)
 *     responses:
 *       200: { description: Product list }
 *
 * /api/product/search-product:
 *   post:
 *     tags: [Products]
 *     summary: Search products
 *     responses:
 *       200: { description: Product list }
 *
 * /api/product/get-product-details:
 *   post:
 *     tags: [Products]
 *     summary: Product details by body (IDs)
 *     responses:
 *       200: { description: Product details }
 *
 * /api/product/get-product-by-category:
 *   post:
 *     tags: [Products]
 *     summary: Products filtered by category
 *     responses:
 *       200: { description: Product list }
 *
 * /api/product/get-pruduct-by-category-and-subcategory:
 *   post:
 *     tags: [Products]
 *     summary: Products by category and subcategory (legacy path spelling)
 *     responses:
 *       200: { description: Product list }
 *
 * /api/product/update-product-details:
 *   put:
 *     tags: [Products]
 *     summary: Update product (alias; owner or Admin)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 */

export {};
