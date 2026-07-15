/**
 * /api/order — preview checkout, place COD/online, my orders, invoice, admin status.
 */
import { Router } from 'express'
import auth from '../../shared/middleware/auth.js'
import { admin, staff } from '../../shared/middleware/roles.js'
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
  previewCheckoutController,
  updateOrderStatusController,
  adminCreateOrderController,
  listOrderNotesController,
  addOrderNoteController,
} from '../controllers/order.controller.js'
import { validateBody } from '../../shared/middleware/validate.js'
import {
  previewCheckoutBodySchema,
  checkoutWithAddressBodySchema,
} from '../../shared/validation/schemas.js'

const orderRouter = Router()
orderRouter.post('/preview-checkout', auth, validateBody(previewCheckoutBodySchema), previewCheckoutController)
orderRouter.post('/place-cod', auth, validateBody(checkoutWithAddressBodySchema), CashOnDeliveryOrderController)
orderRouter.post('/place-online', auth, validateBody(checkoutWithAddressBodySchema), paymentController)
orderRouter.get('/my-orders', auth, getOrderDetailsController)
orderRouter.get('/invoice/:id', auth, getInvoiceController)
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
