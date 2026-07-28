/**
 * /api/payment — mock intent + verify + Stripe webhook.
 * @see controllers/payment.controller.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    createPaymentIntentController,
    verifyPaymentController,
    stripeWebhookController,
} from "../controllers/payment.controller.js";

const paymentRouter = Router();
paymentRouter.post("/create-intent", auth, createPaymentIntentController);
paymentRouter.post("/verify", auth, verifyPaymentController);
// Webhook is mounted with express.raw in server.js — keep this for completeness if remounted
paymentRouter.post("/webhook", stripeWebhookController);

export default paymentRouter;
