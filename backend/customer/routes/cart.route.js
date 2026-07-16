/**
 * /api/cart — guest or logged-in cart (Phase 4).
 * Send X-Guest-Id header or guest_id cookie when anonymous.
 */
import { Router } from 'express';
import optionalAuth from '../../shared/middleware/optionalAuth.js';
import { resolveCartOwner, requireCartOwner } from '../../shared/middleware/guestCart.js';
import auth from '../../shared/middleware/auth.js';
import { staff } from '../../shared/middleware/roles.js';
import {
    addToCartController,
    getCartController,
    removeCartController,
    updateCartController,
    validateCartController,
    purgeExpiredCartController,
} from '../controllers/cart.controller.js';

const cartRouter = Router();
// Shared guest-cart middleware: optional auth + guest/user owner resolution + ownership guard.
const guestCart = [optionalAuth, resolveCartOwner, requireCartOwner];

// POST /add - add an item to cart (guest cart middleware applied).
cartRouter.post('/add', ...guestCart, addToCartController);
// GET /get - fetch cart by resolved owner (guest cart middleware applied).
cartRouter.get('/get', ...guestCart, getCartController);
// PUT /update - update cart item quantity/details (guest cart middleware applied).
cartRouter.put('/update', ...guestCart, updateCartController);
// DELETE /delete - remove item from cart (guest cart middleware applied).
cartRouter.delete('/delete', ...guestCart, removeCartController);
// POST /validate - validate cart pricing/availability (guest cart middleware applied).
cartRouter.post('/validate', ...guestCart, validateCartController);
// POST /purge-expired - clear expired carts (requires auth + staff role).
cartRouter.post('/purge-expired', auth, staff, purgeExpiredCartController);

export default cartRouter;
