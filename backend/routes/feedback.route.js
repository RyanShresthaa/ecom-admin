/**
 * /api/feedback — customer feedback (product, seller, or business). POST /submit allows optional auth.
 * @see controllers/feedback.controller.js · OpenAPI: docs/openapi/feedback.paths.js
 */
import { Router } from 'express';
import optionalAuth from '../middleware/optionalAuth.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { feedbackSubmitBodySchema } from '../validation/schemas.js';
import { submitFeedbackController } from '../controllers/feedback.controller.js';

const feedbackRouter = Router();
feedbackRouter.post(
    '/submit',
    contactLimiter,
    optionalAuth,
    validateBody(feedbackSubmitBodySchema),
    submitFeedbackController,
);

export default feedbackRouter;
