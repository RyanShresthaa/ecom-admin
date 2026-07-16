/**
 * Admin / staff HTTP surface (dashboard, inventory, sales, purchases).
 */
import { Router } from 'express'
import adminRouter from './routes/admin.route.js'
import inventoryRouter from './routes/inventory.route.js'
import salesRouter from './routes/sales.route.js'
import purchaseRouter from './routes/purchase.route.js'

const staffRouter = Router()

// Mount admin auth, users, and dashboard endpoints.
staffRouter.use('/admin', adminRouter)
// Mount stock control and warehouse inventory endpoints.
staffRouter.use('/inventory', inventoryRouter)
// Mount sales analytics and transaction endpoints.
staffRouter.use('/sales', salesRouter)
// Mount purchase order and supplier endpoints.
staffRouter.use('/purchases', purchaseRouter)

export default staffRouter
