/**
 * /api/wishlist — list, add, remove (auth).
 * @see controllers/wishlist.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import {
    addWishlistController,
    getWishlistController,
    removeWishlistController,
} from '../controllers/wishlist.controller.js';

const wishlistRouter = Router();
// GET / - list current user's wishlist (requires auth).
wishlistRouter.get('/', auth, getWishlistController);
// POST /add - add product to wishlist (requires auth).
wishlistRouter.post('/add', auth, addWishlistController);
// DELETE /remove - remove product from wishlist (requires auth).
wishlistRouter.delete('/remove', auth, removeWishlistController);

export default wishlistRouter;
