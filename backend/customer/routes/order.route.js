/**
 * /api/order — preview checkout, place COD/online, my orders, invoice, admin status.
 * Phase 3: tracking, delivery FSM reference, reorder.
 */
import { Router } from 'express'
import auth from '../../shared/middleware/auth.js'
import { staff } from '../../shared/middleware/roles.js'
import {
  CashOnDeliveryOrderController,
  getAllOrdersController,
  getAdminOrderListController,
  getOrderGroupController,
  getSalesSeriesController,
  getOrdersByProductController,
  getInvoiceController,
  getOrderDetailsController,
  paymentController,
  placeOrderController,
  confirmStripeCheckoutController,
  previewCheckoutController,
  updateOrderStatusController,
  adminCreateOrderController,
  listOrderNotesController,
  addOrderNoteController,
  listDeliveryStatusesController,
  updateTrackingController,
  updateExpectedDeliveryController,
  reorderController,
} from '../controllers/order.controller.js'
import { validateBody } from '../../shared/middleware/validate.js'
import {
  previewCheckoutBodySchema,
  checkoutWithAddressBodySchema,
  placeOrderBodySchema,
  confirmStripeBodySchema,
  updateTrackingBodySchema,
  updateExpectedDeliveryBodySchema,
  reorderBodySchema,
} from '../../shared/validation/schemas.js'

const orderRouter = Router()
// POST /preview-checkout - compute checkout preview (requires auth + schema validation).
orderRouter.post('/preview-checkout', auth, validateBody(previewCheckoutBodySchema), previewCheckoutController)
/** Unified: { paymentMethod: "cash" | "stripe", addressId, useCart?, list_items?, couponCode? } */
// POST /place - place order (requires auth + unified place-order schema).
orderRouter.post('/place', auth, validateBody(placeOrderBodySchema), placeOrderController)
// POST /place-cod - place cash-on-delivery order (requires auth + checkout schema).
orderRouter.post('/place-cod', auth, validateBody(checkoutWithAddressBodySchema), CashOnDeliveryOrderController)
// POST /place-online - initiate online payment order flow (requires auth + checkout schema).
orderRouter.post('/place-online', auth, validateBody(checkoutWithAddressBodySchema), paymentController)
/** After Stripe redirect: { sessionId } → create paid order */
// POST /confirm-stripe - confirm Stripe checkout session (requires auth + schema validation).
orderRouter.post('/confirm-stripe', auth, validateBody(confirmStripeBodySchema), confirmStripeCheckoutController)
// GET /my-orders - list current user's orders (requires auth).
orderRouter.get('/my-orders', auth, getOrderDetailsController)
// GET /invoice/:id - fetch order invoice (requires auth).
orderRouter.get('/invoice/:id', auth, getInvoiceController)
// POST /reorder - reorder from previous purchase (requires auth + schema validation).
orderRouter.post('/reorder', auth, validateBody(reorderBodySchema), reorderController)

// Staff delivery tools (requires auth + staff role).
orderRouter.get('/delivery-statuses', auth, staff, listDeliveryStatusesController)
// PUT /tracking - update shipment tracking (requires auth + staff + schema validation).
orderRouter.put('/tracking', auth, staff, validateBody(updateTrackingBodySchema), updateTrackingController)
// PUT /expected-delivery - set admin ETA after order is Confirmed.
orderRouter.put(
  '/expected-delivery',
  auth,
  staff,
  validateBody(updateExpectedDeliveryBodySchema),
  updateExpectedDeliveryController,
)

// Staff/admin order management and analytics endpoints (requires auth + staff role).
orderRouter.get('/all', auth, staff, getAllOrdersController)
orderRouter.get('/admin-list', auth, staff, getAdminOrderListController)
orderRouter.get('/group/:orderId', auth, staff, getOrderGroupController)
orderRouter.get('/sales-series', auth, staff, getSalesSeriesController)
orderRouter.get('/by-product/:productId', auth, staff, getOrdersByProductController)
orderRouter.put('/update-status', auth, staff, updateOrderStatusController)
orderRouter.post('/admin-create', auth, staff, adminCreateOrderController)
orderRouter.get('/notes/:orderGroupId', auth, staff, listOrderNotesController)
orderRouter.post('/notes', auth, staff, addOrderNoteController)

export default orderRouter
