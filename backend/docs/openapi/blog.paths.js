/**
 * OpenAPI path definitions (tag: Blog). Merged by config/swagger.js.
 * @see customer/routes/blog.route.js
 */

/**
 * @openapi
 * /api/blog:
 *   get:
 *     tags: [Blog]
 *     summary: List published blog posts (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Published posts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BlogPostSummary'
 *                     totalCount:
 *                       type: integer
 *   post:
 *     tags: [Blog]
 *     summary: Create blog post (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlogPostBody'
 *     responses:
 *       201: { description: Created }
 *       403: { description: Staff only }
 *
 * /api/blog/admin-list:
 *   get:
 *     tags: [Blog]
 *     summary: List all posts including drafts (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: All posts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BlogPostSummary'
 *                     totalCount:
 *                       type: integer
 *
 * /api/blog/post/{slugOrId}:
 *   get:
 *     tags: [Blog]
 *     summary: Get single post by slug or numeric id
 *     description: Drafts visible only to staff when authenticated.
 *     parameters:
 *       - in: path
 *         name: slugOrId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post detail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BlogPost'
 *       404: { description: Not found or draft (non-staff) }
 *
 * /api/blog/{id}:
 *   put:
 *     tags: [Blog]
 *     summary: Update blog post (staff)
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
 *             $ref: '#/components/schemas/BlogPostBody'
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Blog]
 *     summary: Delete blog post (staff)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */

export {};
