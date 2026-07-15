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
wishlistRouter.get('/', auth, getWishlistController);
wishlistRouter.post('/add', auth, addWishlistController);
wishlistRouter.delete('/remove', auth, removeWishlistController);

export default wishlistRouter;
