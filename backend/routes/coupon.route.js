/**
 * /api/coupon — validate (public), staff list/create/delete.
 * @see controllers/coupon.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import {
    createCouponController,
    deleteCouponController,
    listCouponsController,
    updateCouponController,
    validateCouponController,
} from '../controllers/coupon.controller.js';

const couponRouter = Router();
couponRouter.post('/validate', validateCouponController);
couponRouter.get('/list', auth, admin, listCouponsController);
couponRouter.post('/create', auth, admin, createCouponController);
couponRouter.put('/:id', auth, admin, updateCouponController);
couponRouter.delete('/:id', auth, admin, deleteCouponController);

export default couponRouter;
