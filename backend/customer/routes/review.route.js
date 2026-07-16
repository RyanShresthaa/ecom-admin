/**
 * /api/review — list by product (public); add/delete own (auth).
 * @see controllers/review.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import {
    addReviewController,
    deleteReviewController,
    getReviewsController,
} from '../controllers/review.controller.js';

const reviewRouter = Router();
// GET /product/:productId - list reviews for a product (public).
reviewRouter.get('/product/:productId', getReviewsController);
// POST /add - create product review (requires auth).
reviewRouter.post('/add', auth, addReviewController);
// DELETE /:id - delete own review by id (requires auth).
reviewRouter.delete('/:id', auth, deleteReviewController);

export default reviewRouter;
