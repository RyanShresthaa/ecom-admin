/**
 * OpenAPI path definitions (tag: Chat). Merged by config/swagger.js.
 * @see customer/routes/chat.route.js, admin/routes/chat.route.js
 */

/**
 * @openapi
 * /api/chat/status:
 *   get:
 *     tags: [Chat]
 *     summary: Chatbot provider status (public, no secrets)
 *     responses:
 *       200:
 *         description: Provider name and configuration hints
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ChatbotStatus'
 *
 * /api/chat/sessions:
 *   post:
 *     tags: [Chat]
 *     summary: Start a chat session (logged-in or guest)
 *     description: |
 *       Logged-in users attach `user_id` automatically.
 *       Guests receive a `guestToken` in the response — send it as header `X-Chat-Guest-Token` on later requests.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatSessionCreateBody'
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         session:
 *                           $ref: '#/components/schemas/ChatSession'
 *                         guestToken:
 *                           type: string
 *                           description: Present for anonymous sessions only
 *       400: { description: Validation error }
 *   get:
 *     tags: [Chat]
 *     summary: List my chat sessions (logged-in users)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 100 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Session list
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
 *                         $ref: '#/components/schemas/ChatSession'
 *       401: { description: Login required }
 *
 * /api/chat/sessions/{id}:
 *   get:
 *     tags: [Chat]
 *     summary: Get chat session detail
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ChatGuestTokenHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ChatSession'
 *       403: { description: Guest token required or wrong owner }
 *       404: { description: Not found }
 *
 * /api/chat/sessions/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: List messages in a session
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ChatGuestTokenHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: beforeId
 *         schema: { type: integer }
 *         description: Pagination — messages with id less than this value
 *     responses:
 *       200:
 *         description: Message history (oldest first)
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
 *                         $ref: '#/components/schemas/ChatMessage'
 *       403: { description: Guest token required or wrong owner }
 *       404: { description: Not found }
 *   post:
 *     tags: [Chat]
 *     summary: Send user message and receive assistant reply
 *     description: Persists user message, calls configured provider (stub by default), persists assistant reply.
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ChatGuestTokenHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessageBody'
 *     responses:
 *       201:
 *         description: User message + assistant reply
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         userMessage:
 *                           $ref: '#/components/schemas/ChatMessage'
 *                         assistantMessage:
 *                           $ref: '#/components/schemas/ChatMessage'
 *       400: { description: Empty content or session closed }
 *       403: { description: Guest token required or wrong owner }
 *       501: { description: LLM provider not implemented (e.g. openai without wiring) }
 *
 * /api/chat/sessions/{id}/close:
 *   post:
 *     tags: [Chat]
 *     summary: Close a chat session
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ChatGuestTokenHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session closed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ChatSession'
 *       403: { description: Guest token required or wrong owner }
 *       404: { description: Not found }
 *
 * /api/admin/chat/sessions:
 *   get:
 *     tags: [Chat]
 *     summary: List all chat sessions (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, closed] }
 *     responses:
 *       200:
 *         description: Sessions with user name/email when linked
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
 *                         $ref: '#/components/schemas/ChatSessionAdmin'
 *       403: { description: Staff only }
 *
 * /api/admin/chat/sessions/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Read full transcript (staff)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100, maximum: 500 }
 *     responses:
 *       200:
 *         description: Session + messages
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         session:
 *                           $ref: '#/components/schemas/ChatSessionAdmin'
 *                         messages:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ChatMessage'
 *       404: { description: Not found }
 */

export {};
