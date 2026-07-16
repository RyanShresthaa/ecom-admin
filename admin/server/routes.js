import { Router } from 'express'

import { getDb } from './db.js'
import { enrichProductRow, getProductMetrics, getReorderSuggestions, paginateList, removeProductFromOrders, toPublicUser } from './utils.js'
import {
  parseSorting,
  syncProductStockFromInventory,
  recordStockMovement,
  enrichMovementRow,
  enrichInventoryRow,
  enrichPurchaseOrder,
  getProductAvailableStock,
  syncProductStockField,
  deductOrderStock,
  applyOrderStatusUpdates,
  syncInventoryFromProducts,
} from './services/domain.service.js'

import { login, session as authSession, logout, forgotPassword, resetPassword } from './controllers/auth.controller.js'
import { stats as dashboardStats, salesSeries as dashboardSalesSeries, recentOrders as dashboardRecentOrders } from './controllers/dashboard.controller.js'
import { listCustomers, getCustomerById, getCustomerOrders, patchCustomer } from './controllers/customers.controller.js'
import { createProductsController } from './controllers/products.controller.js'
import { createOrdersController } from './controllers/orders.controller.js'
import { createInventoryController } from './controllers/inventory.controller.js'
import {
  getSettings,
  updateSettings,
  search,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAccount,
  patchAccount,
  changePassword,
} from './controllers/system.controller.js'

const router = Router()

const productsController = createProductsController({
  parseSorting,
  paginateList,
  enrichProductRow,
  getProductMetrics,
  getProductAvailableStock,
  syncProductStockField,
  syncInventoryFromProducts,
  removeProductFromOrders,
})

const ordersController = createOrdersController({
  parseSorting,
  paginateList,
  applyOrderStatusUpdates,
  deductOrderStock,
  syncCustomerStats,
})

const inventoryController = createInventoryController({
  parseSorting,
  paginateList,
  getReorderSuggestions,
  enrichInventoryRow,
  enrichMovementRow,
  recordStockMovement,
  syncProductStockFromInventory,
  enrichPurchaseOrder,
})

// Auth helper: resolves current user from Authorization bearer token.
function getUserFromToken(db, token) {
  if (!token) return null
  const userId = db.sessions[token]
  if (!userId) return null
  const user = db.users.find((u) => u.id === userId)
  return user ? toPublicUser(user) : null
}

// Route guard: requires authenticated session token for protected endpoints.
function requireAuth(req, res, next) {
  const db = getDb()
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const user = getUserFromToken(db, token)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  req.user = user
  req.token = token
  next()
}


// --- Auth ---
router.post('/auth/login', login)
router.get('/auth/session', authSession)
router.post('/auth/logout', requireAuth, logout)
router.post('/auth/forgot-password', forgotPassword)
router.post('/auth/reset-password', resetPassword)

// --- Dashboard ---
router.get('/dashboard/stats', dashboardStats)
router.get('/dashboard/sales-series', dashboardSalesSeries)
router.get('/dashboard/recent-orders', dashboardRecentOrders)

// --- Customers ---
router.get('/customers', listCustomers)
router.get('/customers/:id', getCustomerById)
router.get('/customers/:id/orders', getCustomerOrders)
router.patch('/customers/:id', patchCustomer)

// --- Products ---
router.get('/products/options', productsController.options)
router.get('/products', productsController.list)
router.get('/products/categories', productsController.categories)
router.get('/products/export/csv', productsController.exportCsv)
router.post('/products/import/csv', productsController.importCsv)
router.get('/products/:id/analytics', productsController.analytics)
router.get('/products/:id', productsController.getById)

router.post('/products', productsController.create)
router.put('/products/:id', productsController.update)
router.delete('/products/:id', productsController.remove)
router.post('/products/:id/image', productsController.updateImage)

// --- Orders ---
router.get('/orders', ordersController.list)
router.get('/orders/:id', ordersController.getById)
router.patch('/orders/:id/status', ordersController.updateStatus)
router.post('/orders/bulk-status', ordersController.bulkStatus)
router.post('/orders/:id/notes', ordersController.addNote)
router.post('/orders', ordersController.create)

// --- Inventory ---
router.get('/inventory', inventoryController.list)
router.get('/inventory/warehouses', inventoryController.warehouses)
router.get('/inventory/adjustment-reasons', inventoryController.adjustmentReasons)
router.get('/inventory/movements', inventoryController.movements)
router.post('/inventory/adjust', inventoryController.adjust)
router.get('/inventory/reorder-suggestions', inventoryController.reorderSuggestions)
router.get('/inventory/purchase-orders', inventoryController.purchaseOrders)
router.get('/inventory/purchase-orders/:id', inventoryController.getPurchaseOrderById)
router.post('/inventory/purchase-orders', inventoryController.createPurchaseOrder)
router.patch('/inventory/purchase-orders/:id/status', inventoryController.updatePurchaseOrderStatus)

// --- Settings ---
router.get('/settings', getSettings)
router.put('/settings', updateSettings)

// --- Search ---
router.get('/search', search)

// --- Notifications ---
router.get('/notifications', listNotifications)
router.patch('/notifications/:id/read', markNotificationRead)
router.post('/notifications/read-all', markAllNotificationsRead)

// --- Account ---
router.get('/account', requireAuth, getAccount)
router.patch('/account', requireAuth, patchAccount)
router.post('/account/password', requireAuth, changePassword)

export default router
