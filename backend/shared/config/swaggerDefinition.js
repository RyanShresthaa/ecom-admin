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
| **Checkout** | Optional \`Idempotency-Key\` header |
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
        },
        parameters: {
            IdempotencyKeyHeader: {
                name: 'Idempotency-Key',
                in: 'header',
                required: false,
                schema: { $ref: '#/components/schemas/IdempotencyKey' },
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
