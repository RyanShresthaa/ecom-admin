/**
 * Swagger UI + OpenAPI JSON via swagger-jsdoc.
 * Path `@openapi` blocks live under `docs/openapi/*.paths.js` (one file per area; see each route file header).
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerDefinition } from './swaggerDefinition.js';

const options = {
    definition: swaggerDefinition,
    // routes/*.js headers are for humans only; paths live in docs/openapi/
    apis: ['./docs/openapi/*.paths.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

/** Mount interactive docs (register before notFound). */
export function setupSwagger(app) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'API Docs' }));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}
