/**
 * OpenAPI path definitions (tag: Auth). Merged by config/swagger.js.
 * @see routes/user.route.js
 */

/**
 * @openapi
 * /api/user/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, description: 'Upper, lower, number, 8+ chars' }
 *     responses:
 *       200: { description: Generic success (anti-enumeration) }
 *
 * /api/user/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: Verified }
 *
 * /api/user/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (sets cookies)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Tokens in body + cookies }
 *
 * /api/user/login-pin:
 *   post:
 *     tags: [Auth]
 *     summary: Login with PIN (sets cookies)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               pin: { type: string }
 *     responses:
 *       200: { description: Logged in }
 *
 * /api/user/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google OAuth login
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               credential: { type: string }
 *     responses:
 *       200: { description: Logged in }
 *
 * /api/user/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Cookies cleared }
 *
 * /api/user/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token
 *     responses:
 *       200: { description: New tokens }
 *
 * /api/user/csrf:
 *   get:
 *     tags: [Auth]
 *     summary: Refresh CSRF token
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: New csrfToken }
 *
 * /api/user/user-details:
 *   get:
 *     tags: [Auth]
 *     summary: Current user profile
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: User object }
 *
 * /api/user/apply-seller:
 *   post:
 *     tags: [Auth]
 *     summary: Apply for seller role
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Application submitted }
 *
 * /api/user/export-account:
 *   get:
 *     tags: [Auth]
 *     summary: Export account data (GDPR)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Data bundle }
 *
 * /api/user/delete-account:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete account
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirm: { type: string, example: DELETE }
 *               password: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *
 * /api/user/forgot-password:
 *   put:
 *     tags: [Auth]
 *     summary: Request password reset OTP (PUT alias)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Generic message }
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Generic message }
 *
 * /api/user/verify-forgot-password-otp:
 *   put:
 *     tags: [Auth]
 *     summary: Verify reset OTP (PUT alias)
 *     responses:
 *       200: { description: OTP valid }
 *   post:
 *     tags: [Auth]
 *     summary: Verify reset OTP
 *     responses:
 *       200: { description: OTP valid }
 *
 * /api/user/reset-password:
 *   put:
 *     tags: [Auth]
 *     summary: Set new password after OTP (PUT alias)
 *     responses:
 *       200: { description: Password updated }
 *   post:
 *     tags: [Auth]
 *     summary: Set new password after OTP
 *     responses:
 *       200: { description: Password updated }
 *
 * /api/user/setup-pin:
 *   post:
 *     tags: [Auth]
 *     summary: Set up account PIN
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: PIN set }
 *
 * /api/user/change-pin:
 *   post:
 *     tags: [Auth]
 *     summary: Change PIN
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 *
 * /api/user/forgot-pin:
 *   put:
 *     tags: [Auth]
 *     summary: Request PIN reset (PUT alias)
 *     responses:
 *       200: { description: OTP sent }
 *   post:
 *     tags: [Auth]
 *     summary: Request PIN reset
 *     responses:
 *       200: { description: OTP sent }
 *
 * /api/user/verify-forgot-pin-otp:
 *   put:
 *     tags: [Auth]
 *     summary: Verify PIN reset OTP (PUT alias)
 *     responses:
 *       200: { description: Valid }
 *   post:
 *     tags: [Auth]
 *     summary: Verify PIN reset OTP
 *     responses:
 *       200: { description: Valid }
 *
 * /api/user/reset-pin:
 *   put:
 *     tags: [Auth]
 *     summary: Reset PIN after OTP (PUT alias)
 *     responses:
 *       200: { description: Updated }
 *   post:
 *     tags: [Auth]
 *     summary: Reset PIN after OTP
 *     responses:
 *       200: { description: Updated }
 *
 * /api/user/deactivate-account:
 *   post:
 *     tags: [Auth]
 *     summary: Deactivate account (reversible flow)
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Deactivated }
 *
 * /api/user/upload-avatar:
 *   put:
 *     tags: [Auth]
 *     summary: Upload profile image
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Avatar URL }
 *
 * /api/user/update-user:
 *   put:
 *     tags: [Auth]
 *     summary: Update profile
 *     security: [{ cookieAuth: [] }, { csrfHeader: [] }]
 *     responses:
 *       200: { description: Updated }
 */

export {};
