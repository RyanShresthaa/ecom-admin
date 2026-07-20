/**
 * /api/stock-alerts — customer back-in-stock waitlist.
 * @see controllers/stockAlert.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express'
import optionalAuth from '../../shared/middleware/optionalAuth.js'
import { subscribeStockAlertController } from '../controllers/stockAlert.controller.js'

const stockAlertRouter = Router()

// POST /subscribe - join waitlist for product restock emails (optional auth).
stockAlertRouter.post('/subscribe', optionalAuth, subscribeStockAlertController)

export default stockAlertRouter
