/**
 * /api/coupon — validate (public), staff list/create/delete.
 * @see controllers/coupon.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { admin } from '../../shared/middleware/roles.js';
import {
    createCouponController,
    deleteCouponController,
    listCouponsController,
    validateCouponController,
} from '../controllers/coupon.controller.js';

const couponRouter = Router();
// POST /validate - validate coupon for checkout (public).
couponRouter.post('/validate', validateCouponController);
// GET /list - list coupons (requires auth + admin).
couponRouter.get('/list', auth, admin, listCouponsController);
// POST /create - create coupon (requires auth + admin).
couponRouter.post('/create', auth, admin, createCouponController);
// DELETE /:id - delete coupon by id (requires auth + admin).
couponRouter.delete('/:id', auth, admin, deleteCouponController);

export default couponRouter;
