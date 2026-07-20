/**
 * Customer back-in-stock waitlist HTTP handlers.
 */
import { upsertStockWaitlist } from '../../shared/models/stockWaitlist.model.js'
import { findProductById } from '../../shared/models/product.model.js'
import { pickId } from '../../shared/utils/sql.js'

// POST /api/stock-alerts/subscribe — join waitlist for a product / variant.
export async function subscribeStockAlertController(req, res) {
    try {
        const productId = pickId(req.body?.productId)
        const variantId = pickId(req.body?.variantId)
        const email = String(req.body?.email || req.user?.email || '').trim()
        if (!productId) {
            return res.status(400).json({ message: 'productId is required', error: true, success: false })
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'A valid email is required', error: true, success: false })
        }

        const product = await findProductById(productId)
        if (!product) {
            return res.status(404).json({ message: 'Product not found', error: true, success: false })
        }

        const stock = Number(product.stock || 0)
        if (stock > 0) {
            return res.status(400).json({
                message: 'This product is already in stock — add it to your cart instead',
                error: true,
                success: false,
            })
        }

        const row = await upsertStockWaitlist({
            productId,
            variantId: variantId || null,
            userId: req.userId || null,
            email,
        })

        return res.json({
            message: 'We will email you when this is back in stock',
            data: { id: row.id, email: row.email, productId: row.product_id },
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}
