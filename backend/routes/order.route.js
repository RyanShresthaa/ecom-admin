/**
 * /api/order — preview checkout, place COD/online, my orders, invoice, admin status.
 * @see controllers/order.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/roles.js";
import {
  CashOnDeliveryOrderController,
  getAllOrdersController,
  getInvoiceController,
  getOrderDetailsController,
  paymentController,
  previewCheckoutController,
  updateOrderStatusController,
  confirmOnlineOrderController,
  cancelMyOrderController,
} from "../controllers/order.controller.js";
import { validateBody } from "../middleware/validate.js";
import {
  previewCheckoutBodySchema,
  checkoutWithAddressBodySchema,
  cancelMyOrderBodySchema,
} from "../validation/schemas.js";

const orderRouter = Router();
orderRouter.post("/preview-checkout", auth, validateBody(previewCheckoutBodySchema), previewCheckoutController);
orderRouter.post("/place-cod", auth, validateBody(checkoutWithAddressBodySchema), CashOnDeliveryOrderController);
orderRouter.post("/place-online", auth, validateBody(checkoutWithAddressBodySchema), paymentController);
orderRouter.post("/confirm-online", auth, confirmOnlineOrderController);
orderRouter.post("/cancel", auth, validateBody(cancelMyOrderBodySchema), cancelMyOrderController);
orderRouter.get("/my-orders", auth, getOrderDetailsController);
orderRouter.get("/invoice/:id", auth, getInvoiceController);
orderRouter.get("/all", auth, admin, getAllOrdersController);
orderRouter.put("/update-status", auth, admin, updateOrderStatusController);

export default orderRouter;
