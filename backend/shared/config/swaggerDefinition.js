/**
 * OpenAPI 3 base spec (info, servers, security schemes, tags). Path YAML lives in docs/openapi/*.paths.js (swagger-jsdoc).
 */
// Define base OpenAPI metadata, security schemes, and shared schemas.
export const swaggerDefinition = {
    openapi: '3.0.3',
    info: {
        title: 'API',
        version: '1.0.0',
        description: `
Production-ready e-commerce REST API (PostgreSQL, Express).

| Topic | Detail |
|-------|--------|
| **Auth** | Cookies \`accessToken\`, \`refreshToken\` |
| **CSRF** | Header \`X-CSRF-Token\` when session cookies exist |
| **Checkout** | Stripe only (\`paymentMethod: "stripe"\`); optional \`Idempotency-Key\` header |
| **Chat (guest)** | Header \`X-Chat-Guest-Token\` after \`POST /api/chat/sessions\` |
| **Roles** | User, Seller, Admin |

Docs: \`docs/README.md\` · Deploy: \`docs/DEPLOYMENT.md\`
        `.trim(),
    },
    servers: [
        { url: 'http://localhost:5000', description: 'Local development' },
        { url: 'https://api.yourdomain.com', description: 'Production (set your domain)' },
    ],
    tags: [
        { name: 'Health', description: 'Liveness & readiness' },
        { name: 'Auth', description: 'Register, login, profile, GDPR' },
        { name: 'Products', description: 'Catalog' },
        { name: 'Categories', description: 'Categories' },
        { name: 'Subcategories', description: 'Subcategories' },
        { name: 'Cart', description: 'Cart' },
        { name: 'Orders', description: 'Checkout & orders' },
        { name: 'Addresses', description: 'Shipping addresses' },
        { name: 'Admin', description: 'Admin dashboard' },
        { name: 'Coupons', description: 'Coupons' },
        { name: 'Reviews', description: 'Reviews' },
        { name: 'Wishlist', description: 'Wishlist' },
        { name: 'Returns', description: 'Returns' },
        { name: 'Shop', description: 'Shop settings' },
        { name: 'Payment', description: 'Payment (mock/Stripe)' },
        { name: 'Upload', description: 'File upload' },
        { name: 'Feedback', description: 'Customer feedback' },
        { name: 'Inventory', description: 'Warehouses and stock movements' },
        { name: 'Blog', description: 'Blog CMS and public posts' },
        { name: 'Chat', description: 'Storefront chatbot (stub provider; swap LLM later)' },
        { name: 'Sales', description: 'Quotations, formal invoices, credit notes' },
        { name: 'Purchases', description: 'Nepal VAT procurement (suppliers, bills, returns)' },
        { name: 'Scale', description: 'Feature flags, MFA, FX, loyalty, reservations, push (gated)' },
    ],
    components: {
        securitySchemes: {
            cookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'accessToken',
                description: 'JWT access token (httpOnly, from login)',
            },
            csrfHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'X-CSRF-Token',
                description: 'Must match csrfToken cookie when logged in',
            },
        },
        schemas: {
            ApiError: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    error: { type: 'boolean', example: true },
                    success: { type: 'boolean', example: false },
                },
            },
            ApiSuccess: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    error: { type: 'boolean', example: false },
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                },
            },
            IdempotencyKey: {
                type: 'string',
                maxLength: 128,
                example: '550e8400-e29b-41d4-a716-446655440000',
            },
            CheckoutBody: {
                type: 'object',
                required: ['addressId'],
                properties: {
                    addressId: { type: 'string' },
                    couponCode: { type: 'string' },
                    useCart: { type: 'boolean' },
                    list_items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'integer', minimum: 1 },
                            },
                        },
                    },
                },
            },
            ChatbotStatus: {
                type: 'object',
                properties: {
                    provider: { type: 'string', enum: ['stub', 'openai'], example: 'stub' },
                    openaiConfigured: { type: 'boolean' },
                    maxHistory: { type: 'integer', example: 20 },
                },
            },
            ChatSession: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'integer', nullable: true },
                    title: { type: 'string' },
                    provider: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'closed'] },
                    messageCount: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ChatSessionAdmin: {
                allOf: [
                    { $ref: '#/components/schemas/ChatSession' },
                    {
                        type: 'object',
                        properties: {
                            userName: { type: 'string', nullable: true },
                            userEmail: { type: 'string', format: 'email', nullable: true },
                        },
                    },
                ],
            },
            ChatMessage: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    sessionId: { type: 'string', format: 'uuid' },
                    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                    content: { type: 'string' },
                    provider: { type: 'string' },
                    metadata: { type: 'object' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            ChatSessionCreateBody: {
                type: 'object',
                properties: {
                    title: { type: 'string', maxLength: 200 },
                    guestToken: { type: 'string', description: 'Optional body fallback for guest auth' },
                },
            },
            ChatMessageBody: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', minLength: 1, maxLength: 8000 },
                    guestToken: { type: 'string', description: 'Optional body fallback for guest auth' },
                },
            },
            PaymentStatus: {
                type: 'object',
                properties: {
                    provider: { type: 'string', example: 'stripe' },
                    status: { type: 'string', enum: ['live', 'test', 'mock', 'disabled'] },
                    stripeConfigured: { type: 'boolean' },
                    mockAllowed: { type: 'boolean' },
                    webhookConfigured: { type: 'boolean' },
                    currency: { type: 'string', example: 'usd' },
                    secretKeyHint: { type: 'string', nullable: true },
                    checkoutFlow: { type: 'string', example: 'stripe_checkout' },
                },
            },
            BlogPostSummary: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    slug: { type: 'string' },
                    excerpt: { type: 'string' },
                    published: { type: 'boolean' },
                    publishedAt: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            BlogPost: {
                allOf: [
                    { $ref: '#/components/schemas/BlogPostSummary' },
                    {
                        type: 'object',
                        properties: {
                            content: { type: 'string' },
                            coverImageUrl: { type: 'string', nullable: true },
                            authorId: { type: 'integer', nullable: true },
                        },
                    },
                ],
            },
            BlogPostBody: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    slug: { type: 'string' },
                    excerpt: { type: 'string' },
                    content: { type: 'string' },
                    coverImageUrl: { type: 'string' },
                    published: { type: 'boolean' },
                },
            },
        },
        parameters: {
            IdempotencyKeyHeader: {
                name: 'Idempotency-Key',
                in: 'header',
                required: false,
                schema: { $ref: '#/components/schemas/IdempotencyKey' },
            },
            ChatGuestTokenHeader: {
                name: 'X-Chat-Guest-Token',
                in: 'header',
                required: false,
                schema: { type: 'string' },
                description: 'Guest session token from POST /api/chat/sessions (required for anonymous access)',
            },
        },
    },
};

/** Reusable response references for @openapi blocks in route files */
// Export common response objects reused across documented API routes.
export const swaggerResponses = {
    unauthorized: { description: 'Not logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
    forbidden: { description: 'CSRF or role denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
};
