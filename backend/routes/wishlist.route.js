/**
 * /api/wishlist — list, add, remove (auth) + share (auth) + public shared view.
 * @see controllers/wishlist.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    getWishlistController,
    addWishlistController,
    removeWishlistController,
    createWishlistShareController,
    getMyWishlistShareController,
    revokeWishlistShareController,
    getSharedWishlistController,
} from '../controllers/wishlist.controller.js';

const wishlistRouter = Router();
wishlistRouter.get('/', auth, getWishlistController);
wishlistRouter.post('/add', auth, addWishlistController);
wishlistRouter.delete('/remove', auth, removeWishlistController);
wishlistRouter.get('/share', auth, getMyWishlistShareController);
wishlistRouter.post('/share', auth, createWishlistShareController);
wishlistRouter.delete('/share', auth, revokeWishlistShareController);
wishlistRouter.get('/shared/:token', getSharedWishlistController);

export default wishlistRouter;
