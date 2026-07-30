/**
 * /api/payment — mock intent + verify + Stripe webhook + saved methods.
 * @see controllers/payment.controller.js · paymentMethod.controller.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { paymentMethodBodySchema } from "../validation/schemas.js";
import {
    createPaymentIntentController,
    verifyPaymentController,
    stripeWebhookController,
} from "../controllers/payment.controller.js";
import {
    verifyPaymentMethodController,
    addPaymentMethodController,
    listPaymentMethodsController,
    deletePaymentMethodController,
    setDefaultPaymentMethodController,
} from "../controllers/paymentMethod.controller.js";

const paymentRouter = Router();
paymentRouter.post("/create-intent", auth, createPaymentIntentController);
paymentRouter.post("/verify", auth, verifyPaymentController);
// Webhook is mounted with express.raw in server.js — keep this for completeness if remounted
paymentRouter.post("/webhook", stripeWebhookController);

paymentRouter.post("/methods/verify", auth, verifyPaymentMethodController);
paymentRouter.post("/methods", auth, validateBody(paymentMethodBodySchema), addPaymentMethodController);
paymentRouter.get("/methods", auth, listPaymentMethodsController);
paymentRouter.delete("/methods", auth, deletePaymentMethodController);
paymentRouter.put("/methods/default", auth, setDefaultPaymentMethodController);

export default paymentRouter;
