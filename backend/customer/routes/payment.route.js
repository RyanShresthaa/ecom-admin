/**
 * /api/payment — mock intent + verify (guarded in production without gateway).
 * @see controllers/payment.controller.js · OpenAPI: docs/openapi/admin.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import { createPaymentIntentController, verifyPaymentController } from "../controllers/payment.controller.js";

const paymentRouter = Router();
paymentRouter.post("/create-intent", auth, createPaymentIntentController);
paymentRouter.post("/verify", auth, verifyPaymentController);

export default paymentRouter;
