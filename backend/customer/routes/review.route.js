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
reviewRouter.get('/product/:productId', getReviewsController);
reviewRouter.post('/add', auth, addReviewController);
reviewRouter.delete('/:id', auth, deleteReviewController);

export default reviewRouter;
