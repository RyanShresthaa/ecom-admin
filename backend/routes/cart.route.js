/**
 * /api/cart — add, list, update, remove lines (auth); abandon beacon (public, rate-limited).
 * @see controllers/cart.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { analyticsLimiter } from '../middleware/rateLimiter.js';
import {
    addToCartController,
    getCartController,
    removeCartController,
    updateCartController,
    abandonCartController,
} from '../controllers/cart.controller.js';

const cartRouter = Router();
cartRouter.post('/add', auth, addToCartController);
cartRouter.get('/get', auth, getCartController);
cartRouter.put('/update', auth, updateCartController);
cartRouter.delete('/delete', auth, removeCartController);
cartRouter.post('/abandon', analyticsLimiter, abandonCartController);

export default cartRouter;
