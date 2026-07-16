import { checkLowStockForProducts } from '../../utils/stockAlerts.js'
import { syncLowStockNotifications } from '../../models/notification.model.js'
import { syncProductStockFromVariants } from '../../services/catalog/index.js'
import { pickId } from '../../utils/sql.js'
import { JOB_NAMES } from '../constants.js'

// Inventory queue processor — stock alerts and warehouse sync jobs.
export async function processInventoryJob(job) {
    switch (job.name) {
        case JOB_NAMES.INVENTORY_LOW_STOCK: {
            const { productIds } = job.data || {}
            await checkLowStockForProducts(productIds || [])
            return { checked: (productIds || []).length }
        }
        case JOB_NAMES.INVENTORY_SYNC_NOTIFICATIONS: {
            await syncLowStockNotifications()
            return { synced: true }
        }
        case JOB_NAMES.INVENTORY_WAREHOUSE_SYNC: {
            const productId = pickId(job.data?.productId)
            if (productId) {
                await syncProductStockFromVariants(productId)
                return { productId, synced: true }
            }
            return { synced: false, reason: 'no_product_id' }
        }
        default:
            throw new Error(`Unknown inventory job: ${job.name}`)
    }
}
