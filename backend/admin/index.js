/**
 * Admin / staff HTTP surface (dashboard, inventory, sales, purchases).
 */
import { Router } from 'express'
import adminRouter from './routes/admin.route.js'
import inventoryRouter from './routes/inventory.route.js'
import salesRouter from './routes/sales.route.js'
import purchaseRouter from './routes/purchase.route.js'

const staffRouter = Router()

staffRouter.use('/admin', adminRouter)
staffRouter.use('/inventory', inventoryRouter)
staffRouter.use('/sales', salesRouter)
staffRouter.use('/purchases', purchaseRouter)

export default staffRouter
