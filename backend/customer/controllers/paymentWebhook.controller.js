/**
 * Payment gateway webhooks — enqueue for async processing (Stripe, etc.).
 */
import { queuePaymentWebhook } from '../../shared/queue/enqueue.js'
import { isQueueEnabled } from '../../shared/queue/connection.js'
import { processPaymentWebhookJob } from '../../shared/queue/processors/paymentWebhook.js'
import { JOB_NAMES } from '../../shared/queue/constants.js'

// POST /api/payment/webhook — accepts raw gateway payload and enqueues processing.
export async function paymentWebhookController(req, res) {
    try {
        const rawBody = req.body
        const signature = req.headers['stripe-signature'] || req.headers['x-signature'] || ''
        const provider = req.query.provider || (signature ? 'stripe' : 'generic')

        const payload = {
            provider,
            rawBody,
            signature,
        }

        if (isQueueEnabled()) {
            await queuePaymentWebhook(payload)
            return res.status(202).json({
                message: 'Webhook accepted for processing',
                error: false,
                success: true,
                queued: true,
            })
        }

        // Inline fallback when queue disabled — still return quickly after processing.
        await processPaymentWebhookJob({
            name: JOB_NAMES.PAYMENT_WEBHOOK_EVENT,
            data: payload,
        })
        return res.json({
            message: 'Webhook processed',
            error: false,
            success: true,
            queued: false,
        })
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Webhook processing failed',
            error: true,
            success: false,
        })
    }
}
