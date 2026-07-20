/**
 * Notify waitlisted customers when a product becomes available again.
 */
import { findProductById } from '../models/product.model.js'
import {
    listPendingWaitlistForProduct,
    markWaitlistNotified,
} from '../models/stockWaitlist.model.js'
import sendEmail from '../config/sendEmail.js'
import { logger } from '../utils/logger.js'
import { queueEmail } from '../queue/enqueue.js'
import { isQueueEnabled } from '../queue/connection.js'

// Email waitlisted shoppers when product (or any stock for it) is back.
export async function notifyBackInStock(productId, { variantId = null } = {}) {
    const product = await findProductById(productId)
    if (!product) return { sent: 0 }

    const stock = Number(product.stock || 0)
    if (stock < 1 && !product.variants?.length) return { sent: 0 }
    if (product.variants?.length) {
        const variantStock = product.variants.reduce((s, v) => s + Number(v.stock || 0), 0)
        if (variantStock < 1) return { sent: 0 }
    }

    const pending = await listPendingWaitlistForProduct(productId, variantId)
    if (!pending.length) return { sent: 0 }

    const shopUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5174').replace(
        /\/$/,
        '',
    )
    const link = `${shopUrl}/product/${product.id}`
    const subject = `${product.name} is back in stock`
    const html = `<p>Good news — <strong>${product.name}</strong> is available again.</p>
<p><a href="${link}">View product</a></p>`

    const notifiedIds = []
    for (const row of pending) {
        try {
            const payload = { sendTo: row.email, subject, html }
            if (isQueueEnabled()) {
                await queueEmail(payload)
            } else {
                await sendEmail(payload)
            }
            notifiedIds.push(row.id)
        } catch (e) {
            logger.warn('Back-in-stock email failed', { email: row.email, message: e.message })
        }
    }

    await markWaitlistNotified(notifiedIds)
    return { sent: notifiedIds.length }
}
