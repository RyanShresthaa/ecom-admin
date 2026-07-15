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
couponRouter.post('/validate', validateCouponController);
couponRouter.get('/list', auth, admin, listCouponsController);
couponRouter.post('/create', auth, admin, createCouponController);
couponRouter.delete('/:id', auth, admin, deleteCouponController);

export default couponRouter;
