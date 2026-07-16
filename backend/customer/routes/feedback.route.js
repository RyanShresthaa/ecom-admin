/**
 * /api/feedback — customer feedback (product, seller, or business). POST /submit allows optional auth.
 * @see controllers/feedback.controller.js · OpenAPI: docs/openapi/feedback.paths.js
 */
import { Router } from 'express';
import optionalAuth from '../../shared/middleware/optionalAuth.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { feedbackSubmitBodySchema } from '../../shared/validation/schemas.js';
import { submitFeedbackController } from '../controllers/feedback.controller.js';

const feedbackRouter = Router();
// POST /submit - submit feedback with optional auth and request-body validation.
feedbackRouter.post('/submit', optionalAuth, validateBody(feedbackSubmitBodySchema), submitFeedbackController);

export default feedbackRouter;
