/**
 * Swagger UI + OpenAPI JSON via swagger-jsdoc.
 * Disabled in production unless ENABLE_SWAGGER=true.
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerDefinition } from './swaggerDefinition.js';

const options = {
    definition: swaggerDefinition,
    apis: ['./docs/openapi/*.paths.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

function swaggerEnabled() {
    if (process.env.ENABLE_SWAGGER === 'true') return true;
    if (process.env.ENABLE_SWAGGER === 'false') return false;
    return process.env.NODE_ENV !== 'production';
}

/** Mount interactive docs (register before notFound). No-op when disabled. */
export function setupSwagger(app) {
    if (!swaggerEnabled()) return;

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'API Docs' }));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}

export function isSwaggerEnabled() {
    return swaggerEnabled();
}
