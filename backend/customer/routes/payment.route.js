/**
 * /api/payment — intents (mock) + Phase 1 refunds (manual / Stripe stub).
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { staff } from '../../shared/middleware/roles.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { createRefundBodySchema } from '../../shared/validation/schemas.js';
import {
    createPaymentIntentController,
    verifyPaymentController,
} from '../controllers/payment.controller.js';
import {
    createRefundController,
    listRefundsController,
    getRefundController,
    getRefundsByOrderRowController,
} from '../controllers/refund.controller.js';

const paymentRouter = Router();

// Checkout helpers (mock / future gateway)
// POST /create-intent - create payment intent for checkout (requires auth).
paymentRouter.post('/create-intent', auth, createPaymentIntentController);
// POST /verify - verify payment result (requires auth).
paymentRouter.post('/verify', auth, verifyPaymentController);

// Refunds — staff only (Admin / Seller)
// POST /refund - create refund request (requires auth + staff + schema validation).
paymentRouter.post('/refund', auth, staff, validateBody(createRefundBodySchema), createRefundController);
// GET /refunds - list refunds (requires auth + staff).
paymentRouter.get('/refunds', auth, staff, listRefundsController);
// GET /refunds/by-order-row/:orderRowId - list refunds for order row (requires auth + staff).
paymentRouter.get('/refunds/by-order-row/:orderRowId', auth, staff, getRefundsByOrderRowController);
// GET /refunds/:id - get refund details by id (requires auth + staff).
paymentRouter.get('/refunds/:id', auth, staff, getRefundController);

export default paymentRouter;
